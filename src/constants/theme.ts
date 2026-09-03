import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '@/types';

export interface ThemeOption {
  value: ThemeMode;
  label: string;
  icon: LucideIcon;
}

/**
 * 主题选项的唯一数据源。
 *
 * 合并了原先各自维护的两份同数据常量：Settings.tsx 的 THEMES 与
 * TopBar.tsx 的 THEME_OPTIONS（两者内容相同、字段顺序不同）。
 *
 * ⚠️ 数组顺序即 TopBar 点击切换时的循环顺序：浅色 → 深色 → 跟随系统。
 */
export const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
];
