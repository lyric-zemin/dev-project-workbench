/**
 * 跨运行时共享的端口常量。
 *
 * 本文件被三处 Node 侧入口共同引用，是端口的唯一来源：
 *   - server/index.js   后端 Express 监听端口
 *   - electron/main.js  注入 PORT 环境变量 + 主窗口加载地址
 *   - vite.config.ts    /api 代理目标地址与开发服务器端口
 *
 * 三个入口都保留了 `process.env.PORT || <默认值>` 的覆盖逻辑，因此改这里的
 * 默认值不会破坏「用环境变量换端口」的用法。
 *
 * ⚠️ 打包注意事项：
 * 本目录是纯 ESM JavaScript（package.json 已声明 "type": "module"），不参与
 * TypeScript 类型检查。新增或重命名本目录下的文件时，必须同步登记进
 * electron-builder.yml 的 `files` 与 `asarUnpack` 两项，缺一不可——
 * 解包后的 server/index.js 是以 ../shared/ 相对路径引包的，只加 files 会让
 * 打包版启动时找不到模块。
 */

/** 后端（Express）监听端口 */
export const API_PORT = 5177;

/** Vite 开发服务器端口 */
export const WEB_PORT = 5173;
