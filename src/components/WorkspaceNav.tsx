import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { GripVertical, Layers, Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useProjectStore } from '@/stores/projectStore';
import { colorClasses } from '@/lib/format';
import { getIcon } from '@/lib/icons';
import type { Workspace } from '@/types';

interface WorkspaceNavProps {
  onCreate: () => void;
  onEdit: (workspace: Workspace) => void;
  onDelete: (workspace: Workspace) => void;
  onNavigate?: () => void;
}

export default function WorkspaceNav({ onCreate, onEdit, onDelete, onNavigate }: WorkspaceNavProps) {
  const navigate = useNavigate();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const reorder = useWorkspaceStore((s) => s.reorder);
  const projects = useProjectStore((s) => s.projects);
  const clearFilters = useProjectStore((s) => s.clearFilters);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const total = projects.length;

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = workspaces.map((w) => w.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    void reorder(ids);
    setDragId(null);
    setOverId(null);
  };

  const select = (id: string) => {
    setActive(id);
    clearFilters();
    onNavigate?.();
  };

  return (
    <nav className="flex h-full flex-col gap-4">
      <div className="flex-1 overflow-y-auto px-3">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          工作区
        </p>

        <button
          type="button"
          onClick={() => select('all')}
          className={clsx(
            'mb-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition',
            activeId === 'all'
              ? 'bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
              : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800/60'
          )}
        >
          <Layers className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="flex-1 truncate text-left">全部项目</span>
          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] tabular-nums text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
            {total}
          </span>
        </button>

        <div className="mt-1 space-y-0.5">
          {workspaces.map((ws) => {
            const Icon = getIcon(ws.icon);
            const color = colorClasses(ws.color);
            const isActive = activeId === ws.id;
            return (
              <div
                key={ws.id}
                draggable
                onDragStart={(e) => {
                  setDragId(ws.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverId(ws.id);
                }}
                onDragLeave={() => setOverId((cur) => (cur === ws.id ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(ws.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                className={clsx(
                  'group flex items-center gap-1.5 rounded-xl pr-1.5 transition',
                  isActive
                    ? 'bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
                    : 'hover:bg-white/70 dark:hover:bg-slate-800/60',
                  overId === ws.id && dragId !== ws.id && 'ring-2 ring-indigo-400',
                  dragId === ws.id && 'opacity-50'
                )}
              >
                <button
                  type="button"
                  onClick={() => select(ws.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-2.5 text-left"
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 opacity-0 transition group-hover:opacity-100 dark:text-slate-600" />
                  <span className={clsx('h-2 w-2 shrink-0 rounded-full', color.dot)} />
                  <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400" />
                  <span
                    className={clsx(
                      'flex-1 truncate text-sm',
                      isActive ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                    )}
                  >
                    {ws.name}
                  </span>
                  <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] tabular-nums text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
                    {ws.projectCount ?? 0}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onEdit(ws)}
                    aria-label={`编辑 ${ws.name}`}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(ws)}
                    aria-label={`删除 ${ws.name}`}
                    className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {workspaces.length === 0 && (
          <p className="mt-3 px-2 text-xs leading-5 text-slate-400 dark:text-slate-500">
            还没有工作区，点击上方按钮创建一个吧。
          </p>
        )}
      </div>

      <div className="space-y-1 border-t border-slate-200 px-3 pt-3 dark:border-slate-800">
        <button
          type="button"
          onClick={onCreate}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-600 transition hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Plus className="h-4 w-4" />
          新建工作区
        </button>
        <button
          type="button"
          onClick={() => {
            navigate('/settings');
            onNavigate?.();
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-600 transition hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Settings className="h-4 w-4" />
          设置
        </button>
      </div>
    </nav>
  );
}
