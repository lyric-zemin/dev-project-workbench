import { useEffect, useState } from 'react';
import clsx from 'clsx';
import Modal from './Modal';
import { WORKSPACE_COLORS } from '@/constants/workspace';
import { ICON_KEYS, getIcon } from '@/lib/icons';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { Workspace } from '@/types';

interface WorkspaceFormModalProps {
  open: boolean;
  workspace: Workspace | null;
  onClose: () => void;
}

export default function WorkspaceFormModal({ open, workspace, onClose }: WorkspaceFormModalProps) {
  const create = useWorkspaceStore((s) => s.create);
  const update = useWorkspaceStore((s) => s.update);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [color, setColor] = useState('indigo');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(workspace?.name ?? '');
    setIcon(workspace?.icon ?? 'Folder');
    setColor(workspace?.color ?? 'indigo');
    setSubmitting(false);
  }, [open, workspace]);

  const submit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    const payload = { name: name.trim(), icon, color };
    if (workspace) {
      await update(workspace.id, payload);
    } else {
      await create(payload);
    }
    setSubmitting(false);
    onClose();
  };

  const PreviewIcon = getIcon(icon);

  return (
    <Modal
      open={open}
      title={workspace ? '编辑工作区' : '新建工作区'}
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
            onClick={() => void submit()}
            disabled={submitting || !name.trim()}
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? '保存中…' : '保存'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
            工作区名称<span className="ml-0.5 text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white',
                WORKSPACE_COLORS.find((c) => c.key === color)?.dot
              )}
            >
              <PreviewIcon className="h-4 w-4" />
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit();
              }}
              placeholder="例如：个人项目"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">图标</p>
          <div className="grid max-h-32 grid-cols-12 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-800">
            {ICON_KEYS.map((key) => {
              const Icon = getIcon(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  title={key}
                  className={clsx(
                    'flex h-7 w-7 items-center justify-center rounded-md transition',
                    icon === key
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">主题色</p>
          <div className="flex flex-wrap gap-2">
            {WORKSPACE_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setColor(c.key)}
                aria-label={c.key}
                className={clsx(
                  'h-7 w-7 rounded-full transition',
                  c.dot,
                  color === c.key ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
