# 开发者项目管理工作台（Dev Project Workbench）

基于 `PRD-1.0.0` 实现的 v1.0.0 版本：统一管理本地开发项目、自动识别技术栈、一键打开编辑器与一键打包。

## 架构说明

PRD 中「一键打开编辑器」「一键打包」依赖 Node.js 的 `child_process`，浏览器无法直接完成，因此采用 **单体内外一体** 结构：

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | React 18 + TypeScript + Vite 6 + Tailwind CSS v4 | 严格遵循 PRD 5.1 技术栈 |
| 状态管理 | Zustand | `projectStore` / `workspaceStore` / `settingsStore` |
| 路由 | React Router 6 | `/` 工作台、`/settings` 设置 |
| 后端 | Express（本地服务，端口 5177） | 项目扫描、技术栈检测、编辑器唤起、构建执行 |
| 存储 | 本地 JSON 文件 `server/data/store.json` | 数据不出本机，支持导出/导入备份 |

- 开发模式：Vite（5173）通过代理转发 `/api` 到本地服务（5177）
- 生产模式：Express 直接托管 `dist`，单端口 `http://127.0.0.1:5177`

## 快速开始

```bash
npm install

# 开发模式（前端热更新 + 后端 --watch）
npm run dev          # 打开 http://localhost:5173

# 生产模式
npm run serve        # 构建并启动，打开 http://127.0.0.1:5177

# 其他
npm run build        # 仅构建前端
npm run typecheck    # TypeScript 类型检查
```

## 已实现功能

### 项目管理
- 多工作区（默认提供「个人 / 公司 / 开源」三个），支持增删改、**拖拽排序**、图标与主题色自定义
- 「全部项目」聚合视图，各工作区实时显示项目数量
- 项目增删改查，状态标记（开发中 / 维护中 / 已归档）
- 网格 / 列表双视图切换
- 排序：自定义（拖拽）、名称、名称拼音、最后更新时间、创建时间、体积，支持升序/降序
- 目录扫描批量导入（自动跳过 `node_modules`、`.git`、`dist` 等）

### 技术栈可视化
- 自动识别：语言（TypeScript / JavaScript / Python / Go / Rust / Java…）、前端框架（React / Vue / Angular / Svelte / Next / Nuxt…）、后端（Express / NestJS / Prisma…）、构建工具（Vite / Webpack / Rollup / Maven…）、包管理器（npm / yarn / pnpm / bun）、工具（Git / Docker / ESLint / Jest…）
- 版本号取自 `package.json`，短包名优先（如 `vite` 优先于 `@vitejs/plugin-react`）
- 点击技术标签即可按该技术筛选项目

### 项目详情
- 右侧详情抽屉：路径、工作区、体积、创建时间、最后更新时间、描述、构建命令
- 技术栈按分类分组展示
- 最近一次 Git 提交（本机需安装 Git）

### 快速操作
- 一键用编辑器打开（VS Code / Cursor / Trae / WebStorm / IDEA / Sublime / Zed / Notepad++ / Vim 等，自动检测是否已安装，可添加自定义编辑器）
- 一键打包：SSE 实时日志、耗时统计、可中途终止、完成通知
- 在文件管理器 / 终端中打开、复制项目路径、刷新技术栈
- 右键卡片唤起操作菜单

### 检索与交互
- 搜索：项目名称 / 路径 / 技术栈 / 描述
- 过滤：状态 + 技术栈 + 工作区，多条件组合
- 快捷键：`Ctrl/⌘ + F` 搜索、`Ctrl/⌘ + N` 新建项目、`Ctrl/⌘ + S` 设置
- 深色 / 浅色 / 跟随系统主题，响应式适配桌面、平板、移动端

### 设置
- 外观、默认视图与排序、编辑器管理与默认编辑器、默认构建命令、构建前确认、扫描深度、数据导出/导入

## 目录结构

```
server/
├── index.js                    # Express 路由与静态托管
├── store.js                    # 本地 JSON 持久化
└── services/
    ├── projectScanner.js       # 目录扫描与项目识别
    ├── techStackDetect.js      # 技术栈检测 / 体积统计 / Git 信息
    ├── editorCommands.js       # 编辑器与文件管理器唤起（跨平台）
    └── buildRunner.js          # 构建任务执行与日志推送
src/
├── components/                 # UI 组件
├── pages/                      # Dashboard / Settings
├── stores/                     # Zustand 状态
├── hooks/                      # 快捷键、项目操作
├── lib/                        # API 客户端、格式化、筛选排序、图标
└── types/                      # TypeScript 类型定义
```

## 注意事项

- 数据全部保存在 `server/data/store.json`，删除该文件即恢复初始状态
- 「移除项目」只删除工作台中的记录，不会删除磁盘文件
- 构建命令在项目根目录执行，已自动将 `node_modules/.bin` 注入 `PATH`；Windows 下通过 shell 解析 `npm.cmd` / `yarn.cmd` / `pnpm.cmd`
- 编辑器检测依赖 `where` / `command -v`，未检测到的编辑器仍可选择使用（若已加入 PATH）
