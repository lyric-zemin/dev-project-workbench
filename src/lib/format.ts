import type { ProjectStatus, TechCategory } from '@/types';

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes < 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) return '-';
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return '-';
  const diff = Date.now() - target;
  if (diff < 0) return '刚刚';
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} 个月前`;
  return `${Math.floor(diff / (365 * day))} 年前`;
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

export const WORKSPACE_COLORS = [
  { key: 'indigo', dot: 'bg-indigo-500', active: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' },
  { key: 'sky', dot: 'bg-sky-500', active: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  { key: 'emerald', dot: 'bg-emerald-500', active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { key: 'amber', dot: 'bg-amber-500', active: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  { key: 'rose', dot: 'bg-rose-500', active: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  { key: 'violet', dot: 'bg-violet-500', active: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  { key: 'cyan', dot: 'bg-cyan-500', active: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300' },
  { key: 'orange', dot: 'bg-orange-500', active: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' },
];

export function colorClasses(key: string) {
  return WORKSPACE_COLORS.find((c) => c.key === key) || WORKSPACE_COLORS[0];
}
