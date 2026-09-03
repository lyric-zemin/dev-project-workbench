/**
 * 后端内部共用常量（仅 server/** 消费的、跨 service 复用的常量）。
 *
 * 归属说明：
 *   - 仅后端内部使用 → 本文件
 *   - 前端使用、需要类型约束 → src/constants/*.ts
 *   - 被后端 / Electron / Vite 等 ≥2 个 Node 侧入口共用 → shared/*.js
 */

/**
 * 递归发现项目时跳过的目录名（services/projectScanner.js 使用）。
 * 面向「扫盘找项目」，因此额外屏蔽系统级目录与 macOS 的特殊目录。
 */
export const SCAN_IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt',
  '.output', '.cache', 'target', 'vendor', '__pycache__', '.venv', 'venv',
  '.idea', '.vscode', 'Library', '$RECYCLE.BIN', 'System Volume Information',
]);

/**
 * 统计项目体积与最后修改时间时跳过的目录名（services/techStackDetect.js 使用）。
 * 面向「遍历文件算体积」，因此屏蔽缓存与临时目录。
 *
 * ⚠️ 与 SCAN_IGNORE_DIRS 的内容**刻意不同，不要合并**：两者用途不同
 * （一个决定「哪些目录算项目」，一个决定「哪些文件计入体积」），
 * 取任一方向都会改变扫描结果或体积统计口径。
 */
export const META_IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt',
  '.output', '.cache', 'target', 'vendor', '__pycache__', '.venv', 'venv',
  '.idea', '.vscode', '.DS_Store', 'tmp', 'temp', '.turbo', '.svelte-kit',
]);
