import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { ChevronRight, FolderOpen, HardDrive, Home, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { api } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import type { BrowseResult } from '@/types';

interface DirectoryPickerProps {
  open: boolean;
  title?: string;
  initialPath?: string;
  onClose: () => void;
  onSelect: (path: string) => void;
}

export default function DirectoryPicker({ open, title = '选择目录', initialPath, onClose, onSelect }: DirectoryPickerProps) {
  const [current, setCurrent] = useState(initialPath || '');
  const [data, setData] = useState<BrowseResult | null>(null);
  const [roots, setRoots] = useState<{ name: string; path: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState('');

  const browse = useCallback(
    async (target: string) => {
      setLoading(true);
      try {
        const result = await api.browse(target);
        setData(result);
        setCurrent(result.path);
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    setManual(initialPath || '');
    void browse(initialPath || '');
    api.roots()
      .then(setRoots)
      .catch(() => setRoots([]));
  }, [open, initialPath, browse]);

  const segments = current ? current.split(/[\\/]/).filter(Boolean) : [];

  return (
    <Modal
      open={open}
      title={title}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSelect(manual || current)}
            disabled={!manual && !current}
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            使用此目录
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {/* 路径输入 */}
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void browse(manual);
            }}
            placeholder="直接输入绝对路径，例如 D:\\code\\my-app"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => void browse(manual)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            前往
          </button>
        </div>

        {/* 面包屑 */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5 text-xs dark:bg-slate-950/60">
          {roots.map((root) => (
            <button
              key={root.path}
              type="button"
              onClick={() => void browse(root.path)}
              className={clsx(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition hover:bg-white dark:hover:bg-slate-800',
                current === root.path && 'bg-white font-medium text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
              )}
            >
              <HardDrive className="h-3 w-3" />
              {root.name}
            </button>
          ))}
          {segments.map((seg, index) => {
            const isWinRoot = /^[A-Za-z]:$/.test(seg);
            const prefix = current.startsWith('/') ? '/' : '';
            const target = isWinRoot
              ? `${seg}\\`
              : (prefix + segments.slice(0, index + 1).join('/')).replace(/^\//, prefix ? '/' : '');
            return (
              <span key={`${seg}-${index}`} className="inline-flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-slate-300" />
                <button
                  type="button"
                  onClick={() => void browse(target)}
                  className="rounded px-1 py-0.5 transition hover:bg-white dark:hover:bg-slate-800"
                >
                  {seg}
                </button>
              </span>
            );
          })}
        </div>

        {/* 目录列表 */}
        <div className="min-h-[240px] max-h-[340px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              读取中…
            </div>
          )}
          {!loading && data?.entries.length === 0 && (
            <p className="py-16 text-center text-sm text-slate-400">该目录下没有子目录</p>
          )}
          {!loading &&
            data?.entries.map((entry) => (
              <button
                key={entry.path}
                type="button"
                onDoubleClick={() => onSelect(entry.path)}
                onClick={() => setManual(entry.path)}
                className={clsx(
                  'flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/60',
                  manual === entry.path && 'bg-indigo-50 dark:bg-indigo-500/10'
                )}
              >
                <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="truncate text-slate-700 dark:text-slate-200">{entry.name}</span>
                <ChevronRight
                  className="ml-auto h-4 w-4 shrink-0 text-slate-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    void browse(entry.path);
                  }}
                />
              </button>
            ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Home className="h-3.5 w-3.5" />
          <span>单击选中目录，点击右侧箭头进入，双击直接进入并选中</span>
        </div>
      </div>
    </Modal>
  );
}
