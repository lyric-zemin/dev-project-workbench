# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm install` | 安装全部依赖（前端 + 后端共用一份 `package.json`，无 workspaces）。 |
| `npm run dev` | 开发模式。用 concurrently 同时启动 `node --watch server/index.js`（后端，端口 5177）与 `vite`（前端，端口 5173）。访问 `http://localhost:5173`，`/api` 由 Vite 代理转发。改后端代码会自动重启。 |
| `npm run build` | 仅构建前端到 `dist/`（纯 `vite build`，不做类型检查）。 |
| `npm run serve` | 生产模式：先 `vite build` 再 `node server/index.js`，Express 单端口 `http://127.0.0.1:5177` 同时托管 API 与 `dist`。 |
| `npm start` | 只启动后端托管已有的 `dist`。注意：`dist` 存在性在启动时判定一次，构建后需重启服务才会生效。 |
| `npm run typecheck` | `tsc --noEmit`。`tsconfig.json` 开启了 `noUnusedLocals` 与 `noUnusedParameters`，未使用的变量/参数会直接报错。 |
| `curl.exe -s http://127.0.0.1:5177/api/health` | 后端存活探针。PowerShell 里 `curl` 是 `Invoke-WebRequest` 别名，务必用 `curl.exe`；POST 传 JSON 请先写入临时文件再用 `--data-binary "@file.json"`，避免引号被 PowerShell 吃掉。 |

| `git commit -F <msgfile>` | **提交信息必须走文件。** 在 PowerShell 里用 `git commit -m "中文信息"` 会产生不可逆的乱码：脚本字符串会被按 GBK 解码后再交给 git，落盘的 commit object 里就是乱码字节（且部分换行会被吞掉），不是单纯的终端显示问题。正确做法是先用编辑器把信息写成 UTF-8 文件，再 `git commit -F 该文件`。校验方式：`git cat-file commit HEAD` 并用 UTF-8 解码查看，不要用 `git log` 直接看。 |

没有配置测试框架与 linter，改动后请至少跑 `npm run typecheck` 与 `npm run build`。

## 架构总览

PRD 3.3 要求用 Node.js `child_process` 打开编辑器与执行打包，浏览器无法完成，因此本项目是 **Vite 前端 + 本地 Express 后端** 的单体结构，而非纯静态应用。前端严格使用 PRD 5.1 指定的 React 18 / Tailwind / Vite / Zustand / React Router。

### 后端（`server/`，原生 ESM JavaScript，无构建步骤）

`server/index.js` 是唯一的路由文件，约 30 个路由，全部挂在 `/api` 下。错误处理有两套约定：同步路由里直接 `throw` 带 `status` 的错误（Express 4 会捕获），异步路由必须包 `asyncHandler`，否则 rejection 会变成未处理 Promise。创建错误的写法是 `Object.assign(new Error(message), { status })`（见 `httpError`），最终由末尾的 4 参数中间件统一转成 `{ error: message }`。

四个 service 各自独立：

- **`services/techStackDetect.js`** — 技术栈识别的核心。`detectTechStack()` 依次读 `package.json` 依赖、锁文件、配置/清单文件、源码扩展名（浅层 2 层）、`.git` 目录。`DEP_TECH` 是依赖名到技术项的映射表，改识别规则主要就是改这张表和 `FILE_TECH`。有一个非显然的坑：依赖会按 **包名长度升序** 处理，保证 `vite` 的版本优先于 `@vitejs/plugin-react`，否则 Vite 版本号会被插件版本顶掉。`getProjectMeta()` 用带上限的递归（最多 12000 文件、6 层，跳过 `node_modules`/`.git`/`dist` 等）统计体积与最后修改时间，无权限目录静默跳过。`getGitInfo()` 用 `execFile('git', ...)` 带 timeout 读取最近提交，失败返回 `null`。
- **`services/projectScanner.js`** — 递归发现项目。命中 `PROJECT_MARKERS`（`package.json`、`go.mod`、`Cargo.toml` 等 20 个标志文件）即停止下钻。`scanDirectory()` 只返回路径候选以保证速度，技术栈补全由 `enrichCandidates()` 以并发 6 的池子后置处理——这就是扫描 32 个项目只花 2.3 秒的原因。另有 `browseDirectory()` 供前端目录选择器使用，`listDrives()` 仅在 win32 枚举盘符。
- **`services/editorCommands.js`** — 导出 `DEFAULT_EDITORS`（13 种编辑器）与 `openWithEditor` / `revealInExplorer` / `openInTerminal`。进程一律 `detached: true` + `unref()`，Windows 下 `shell: true`（否则解析不了 `npm.cmd` 类似的 shim）。`commandExists()` 用 `where`（win32）/ `command -v` 探测并缓存在 `checkCache`，添加或删除自定义编辑器时必须调 `clearEditorCache()`。
- **`services/buildRunner.js`** — 内存中的任务表（最多保留 20 个）。`parseCommand()` 手写引号解析；`buildEnv()` 把 `node_modules/.bin` 注入 PATH 并关闭彩色输出。日志按行存入 `job.logs`（上限 3000 行，超出截断），通过内部订阅表推送。`stopBuild()` 在 Windows 用 `taskkill /pid /t /f`（单纯 `kill()` 杀不掉子进程树）。日志流走 SSE：`GET /api/builds/:id/stream` 先发 `snapshot` 事件（含已有日志），随后推 `log` / `done`，并有 15 秒心跳。

`store.js` 是数据层：模块级 `cache` 变量 + 防抖 120ms 写盘的 `persist()`（`persistSync()` 用于导入等必须立刻落盘的场景），写入先写 `.tmp` 再 `rename` 保证原子性。数据落在 `server/data/store.json`（已 gitignore），**删除该文件即恢复初始状态**（3 个默认工作区 + 0 项目）。所有 store 读取函数返回的是内部对象引用，直接 mutate 会生效但容易漏掉 `persist()`，新增写操作记得调用。

### 前端（`src/`，TypeScript + React）

**入口与数据流**：`App.tsx` 在挂载时只发一次 `GET /api/bootstrap`（一次性拿回 workspaces / projects / settings / platform / homeDir），然后分发到三个 store 并把 `viewMode`/`sortBy`/`sortDir` 同步进 `projectStore`。在此之前渲染 loading，失败则渲染"无法连接本地服务"提示。`homeDir` 用作目录选择器的初始路径。

**三个 Zustand store**：
- `projectStore` — 最重的一个，同时持有项目数据与全部 UI 状态（search、statuses、techs、viewMode、sortBy/sortDir、detailId、formOpen、contextMenu）。所有写操作都做乐观更新：先本地改，失败再回滚并弹 toast。
- `workspaceStore` — 工作区列表 + `activeId`（`'all'` 或具体 id）。
- `settingsStore` — 设置、编辑器列表、platform/homeDir。`patch()` 是局部更新 + 自动持久化；`hydrate()` 会调 `applyTheme()` 把 `.dark` 类写到 `<html>` 并把主题写入 localStorage（key `dwb.theme`）。`index.html` 里有一段内联脚本提前读这个 key，避免首屏主题闪烁。

**筛选与排序全在客户端**：`lib/filters.ts` 是纯函数（无 React 依赖），`filterProjects()` 按工作区 + 状态 + 技术栈（多技术栈为 AND 语义）+ 关键词过滤，`sortProjects()` 里中文拼音排序用 `Intl.Collator('zh-Hans-CN')`，零依赖。`Dashboard.tsx` 用 `useMemo` 组合二者。

**拖拽排序**：全部使用原生 HTML5 DnD，无第三方库。只有 `sortBy === 'custom'` 时才把 `draggable` 打开（`ProjectGrid` 的 `sortable` 属性），drop 时重排 id 数组后调 `reorder()`。工作区拖拽在 `WorkspaceNav` 内自己维护 `dragId`/`overId`。

**组件约定**：
- `Modal` 用 portal 挂到 body，自带 Esc 关闭与 body 滚动锁；所有弹窗都基于它。
- `ProjectCard`（网格）与 `ProjectListItem`（列表）实现同一组 props（`components/projectShared.ts` 的 `ProjectViewProps`），新增展示字段时两边都要改。
- 项目操作全部收敛在 `hooks/useProjectActions.tsx`（**注意是 `.tsx`，里面有 JSX**），它返回 `open/build/reveal/...` 以及 `menuItems(project)`——右键菜单和详情页的"其他操作"共用这一份菜单定义，加操作只需改这里。
- 状态与技术栈的样式表（`STATUS_META` / `CATEGORY_META`）在 `constants/project.ts`，工作区配色（`WORKSPACE_COLORS`）在 `constants/workspace.ts`，改颜色改这里；`lib/format.ts` 只保留格式化函数与 `colorClasses()` 取色函数。

**构建日志的取流方式**：`BuildLogModal` 同时用 SSE 和 1.2 秒轮询 `GET /api/builds/:id`（SSE 的 `log` 事件只推增量文本，服务端 `job.logs` 才是权威来源，所以用轮询补齐）。任务状态变化通过 `onStatusChange` 回调冒泡给 `Dashboard`，`Dashboard` 据此挂载/卸载"构建中离开页面"的 `beforeunload` 拦截。

### 常量存放约定

同一仓库里有三套运行时（浏览器 / Node 后端 / Electron 主进程），常量**按运行时边界归位**，不要凭感觉乱放：

| 位置 | 适用条件 | 现有内容 |
| --- | --- | --- |
| `src/constants/*.ts` | 仅前端消费、需要类型约束 | `theme.ts`（主题选项，数组顺序 = 切换循环顺序）、`sort.ts`（排序选项，**短标签**，由渲染处拼前缀）、`project.ts`（状态/技术栈分类样式表）、`workspace.ts`（工作区配色）、`ui.ts`（网格 5 / 列表 4 的技术栈展示上限）、`storage.ts`（localStorage 键名）、`settings.ts`（前端默认设置） |
| `shared/*.js` | 被 ≥2 个 Node 侧入口消费（后端 / Electron / `vite.config.ts`） | `ports.js`（`API_PORT` / `WEB_PORT`） |
| `server/constants.js` | 仅后端内部跨 service 复用 | 扫描与统计各自的忽略目录集合 |

要点：

- **不要建桶文件**（`src/constants/index.ts`）：各常量域互不相关（主题域还引入 lucide 图标），桶文件会让只用到排序常量的模块被牵连引入图标。按域深路径导入 `@/constants/sort`。
- **`shared/` 是纯 ESM JavaScript**，不在 `tsconfig` 的 `include` 内、不参与类型检查，前端不要 import 它。
- **改动 `shared/` 的文件清单时，必须同步 `electron-builder.yml` 的 `files` 与 `asarUnpack`**，缺 `asarUnpack` 会导致打包版启动时找不到模块而直接崩溃——解包后的 `server/index.js` 是以 `../shared/` 相对路径引包的。
- **三处无法直接共享、保留副本并加了互链注释**：`server/store.js` 的 `DEFAULT_SETTINGS`（对应 `src/constants/settings.ts`）、`index.html` 内联脚本里的 `'dwb.theme'`（对应 `constants/storage.ts`，内联脚本不是 module 无法 import）。改任意一侧都要同步另一侧。
- **只在一处使用的常量不搬迁**，就近定义即可（如 `Modal.tsx` 的 `SIZES`、`ContextMenu.tsx` 的菜单尺寸、后端各 service 内的上限值）。

### 配置注意事项

- 路径别名 `@/*` 在 **两处** 各配了一份：`tsconfig.json` 的 `paths` 和 `vite.config.ts` 的 `resolve.alias`。改别名必须同时改两处，否则类型检查通过但运行时报错。
- 没有 `tsconfig.node.json`——原本的 composite + noEmit 组合会触发 TS6310，已移除引用，因此 `vite.config.ts` 不参与类型检查。
- Tailwind v4：`src/index.css` 里只有 `@import 'tailwindcss'` 加一条 `@custom-variant dark (&:where(.dark, .dark *))`。深色模式依赖 `<html>` 上的 `.dark` 类，**不要用 `darkMode: 'media'` 那套 v3 配置**，`tailwind.config.js` 不存在也不需要。
- 每次会话结束前请运行 `npm run typecheck` 和 `npm run build`；涉及后端改动的，用 `curl.exe` 打一遍 `api/health`、`api/bootstrap` 与改动涉及的路由。
