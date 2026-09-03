import { WORKSPACE_COLORS } from '@/constants/workspace';

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

/**
 * 取工作区配色，未命中时回退到第一组。
 * 配色数据见 @/constants/workspace。
 */
export function colorClasses(key: string) {
  return WORKSPACE_COLORS.find((c) => c.key === key) || WORKSPACE_COLORS[0];
}
