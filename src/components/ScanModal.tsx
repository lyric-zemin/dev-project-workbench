import { useState } from 'react';
import clsx from 'clsx';
import { Check, FolderSearch, Loader2, ScanLine } from 'lucide-react';
import Modal from './Modal';
import DirectoryPicker from './DirectoryPicker';
import TechStackBadge from './TechStackBadge';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import { toast } from '@/stores/toastStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useProjectStore } from '@/stores/projectStore';
import type { ScanCandidate } from '@/types';

interface ScanModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ScanModal({ open, onClose }: ScanModalProps) {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const setAll = useProjectStore((s) => s.setAll);

  const [rootPath, setRootPath] = useState('');
  const [maxDepth, setMaxDepth] = useState(3);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [workspaceId, setWorkspaceId] = useState('');

  const effectiveWorkspaceId = workspaceId || (activeId !== 'all' ? activeId : (workspaces[0]?.id ?? ''));

  const runScan = async () => {
    if (!rootPath.trim()) {
      toast.error('请先选择要扫描的目录');
      return;
    }
    setScanning(true);
    setResults([]);
    try {
      const res = await api.scan(rootPath.trim(), maxDepth);
      setResults(res.projects);
      setSelected(new Set(res.projects.map((p) => p.path)));
      setElapsed(res.elapsed);
      if (!res.projects.length) toast.info('未在该目录下发现项目');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const doImport = async () => {
    const picked = results.filter((p) => selected.has(p.path));
    if (!picked.length) {
      toast.error('请至少选择一个项目');
      return;
    }
    setImporting(true);
    try {
      const res = await api.importScan(effectiveWorkspaceId, picked);
      if (res.imported > 0) {
        setAll([...useProjectStore.getState().projects, ...res.projects]);
        toast.success(`已导入 ${res.imported} 个项目${res.skipped ? `，跳过 ${res.skipped} 个已存在项` : ''}`);
        onClose();
      } else {
        toast.info('所选项目均已存在，未重复导入');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Modal
        open={open && !pickerOpen}
        title="扫描目录导入项目"
        description="选择一个父目录，工作台会递归查找其中的项目（自动跳过 node_modules 等依赖目录）。"
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
              onClick={() => void doImport()}
              disabled={importing || !results.length || !selected.size}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {importing ? '导入中…' : `导入所选（${selected.size}）`}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              placeholder="要扫描的父目录，例如 D:\\code"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <FolderSearch className="h-4 w-4" />
              浏览
            </button>
            <select
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              title="扫描层级"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  深度 {d} 层
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void runScan()}
              disabled={scanning}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              开始扫描
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">导入到</span>
            <select
              value={effectiveWorkspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-h-[200px] max-h-[360px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
            {scanning && (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在扫描，请稍候…
              </div>
            )}
            {!scanning && !results.length && (
              <p className="py-16 text-center text-sm text-slate-400">选择目录后点击「开始扫描」</p>
            )}
            {!scanning && results.length > 0 && (
              <>
                <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-400 dark:border-slate-800">
                  共发现 {results.length} 个项目，耗时 {elapsed} ms
                </p>
                {results.map((item) => {
                  const checked = selected.has(item.path);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => toggle(item.path)}
                      className={clsx(
                        'flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition last:border-b-0 dark:border-slate-800/60',
                        checked ? 'bg-indigo-50/60 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <span
                        className={clsx(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          checked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                        )}
                      >
                        {checked && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.name}</p>
                        <p className="truncate text-[11px] text-slate-400">{item.path}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(item.techStack ?? []).slice(0, 5).map((tech) => (
                            <TechStackBadge key={tech.name} tech={tech} />
                          ))}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] text-slate-400">{formatBytes(item.size)}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </Modal>

      <DirectoryPicker
        open={pickerOpen}
        title="选择要扫描的父目录"
        initialPath={rootPath}
        onClose={() => setPickerOpen(false)}
        onSelect={(path) => {
          setRootPath(path);
          setPickerOpen(false);
        }}
      />
    </>
  );
}
