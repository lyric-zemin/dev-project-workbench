import type { SortBy } from '@/types';

export interface SortOption {
  value: SortBy;
  label: string;
}

/**
 * 排序选项的唯一数据源。
 *
 * 原先 SearchFilter.tsx 与 Settings.tsx 各维护一份，且 label 风格不一
 * （一处是「名称」，另一处是「按名称」）。
 *
 * 这里统一为**短标签**（不含「按 / 排序」），由各渲染处按自身文案习惯拼接：
 *   - SearchFilter 下拉：`按{label}排序`
 *   - Settings 默认排序下拉：custom 项直出 label，其余项加「按」前缀
 * 如此既共用一份数据，又保持两处 UI 文案与改动前逐字一致。
 *
 * ⚠️ 数组顺序即下拉选项的展示顺序。
 */
export const SORT_OPTIONS: SortOption[] = [
  { value: 'custom', label: '自定义（可拖拽）' },
  { value: 'name', label: '名称' },
  { value: 'pinyin', label: '名称拼音' },
  { value: 'lastUpdated', label: '最后更新时间' },
  { value: 'createdAt', label: '创建时间' },
  { value: 'size', label: '项目体积' },
];
