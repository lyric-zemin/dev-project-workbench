import type { AppSettings } from '@/types';

/**
 * 前端默认设置，用于 bootstrap 返回前的初始状态。
 *
 * ⚠️ 存在一份内容相同的副本：`server/store.js` 的 `DEFAULT_SETTINGS`。
 * 后端是原生 ESM JavaScript、不参与 TypeScript 类型检查，本文件是 TS 且带
 * `AppSettings` 类型约束，二者分属不同运行时，直接共享需要额外引入 allowJs
 * 与类型声明，成本高于收益，因此保留两份。
 * **改动此处时必须同步改动 server/store.js**，否则会出现「后端落库的默认值
 * 与前端初始状态不一致」。
 */
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultEditorId: 'vscode',
  buildCommand: 'npm run build',
  viewMode: 'grid',
  sortBy: 'custom',
  sortDir: 'asc',
  scanMaxDepth: 3,
  confirmBeforeBuild: true,
};
