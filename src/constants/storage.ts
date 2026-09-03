/** localStorage 键名，集中登记避免字符串散落各处 */
export const STORAGE_KEYS = {
  /** 主题模式。index.html 的首屏防闪烁内联脚本会读取它——那段脚本是普通
   *  <script>，无法 import 本常量，因此在那里保留了同名字符串字面量。
   *  修改此值时**必须**同步修改 index.html 中的字面量，否则首屏会闪一下主题。 */
  THEME: 'dwb.theme',
} as const;
