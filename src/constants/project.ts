import type { ProjectStatus, TechCategory } from '@/types';

/** 项目状态：文案 + 圆点色 + 徽章样式（Tailwind 类名） */
export const STATUS_META: Record<ProjectStatus, { label: string; dot: string; chip: string }> = {
  active: {
    label: '开发中',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25',
  },
  maintenance: {
    label: '维护中',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25',
  },
  archived: {
    label: '已归档',
    dot: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/25',
  },
};

/** 技术栈分类：文案 + 徽章样式（Tailwind 类名） */
export const CATEGORY_META: Record<TechCategory, { label: string; chip: string }> = {
  language: {
    label: '语言',
    chip: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25',
  },
  frontend: {
    label: '前端',
    chip: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/25',
  },
  backend: {
    label: '后端',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25',
  },
  build: {
    label: '构建',
    chip: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25',
  },
  tool: {
    label: '工具',
    chip: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/25',
  },
  other: {
    label: '其他',
    chip: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/25',
  },
};
