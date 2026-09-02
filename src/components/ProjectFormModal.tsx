import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { FolderSearch } from 'lucide-react';
import Modal from './Modal';
import DirectoryPicker from './DirectoryPicker';
import { STATUS_META } from '@/lib/format';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { Project, ProjectStatus, Workspace } from '@/types';

interface ProjectFormModalProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
}

export default function ProjectFormModal({ open, project, onClose }: ProjectFormModalProps) {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const create = useProjectStore((s) => s.create);
  const update = useProjectStore((s) => s.update);
  const homeDir = useSettingsStore((s) => s.homeDir);
  const defaultBuildCommand = useSettingsStore((s) => s.settings.buildCommand);

  const [name, setName] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [description, setDescription] = useState('');
  const [buildCommand, setBuildCommand] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (project) {
      setName(project.name);
      setProjectPath(project.path);
      setWorkspaceId(project.workspaceId);
      setStatus(project.status);
      setDescription(project.description || '');
      setBuildCommand(project.buildCommand || '');
    } else {
      setName('');
      setProjectPath('');
      setWorkspaceId(activeId !== 'all' ? activeId : (workspaces[0]?.id ?? ''));
      setStatus('active');
      setDescription('');
      setBuildCommand('');
    }
    setPickerOpen(false);
  }, [open, project, activeId, workspaces]);

  const submit = async () => {
    if (!projectPath.trim()) return;
    if (!workspaceId) return;
    setSubmitting(true);
    const payload = {
      name: name.trim(),
      path: projectPath.trim(),
      workspaceId,
      status,
      description: description.trim(),
      buildCommand: buildCommand.trim(),
    };
    const ok = project ? await update(project.id, payload) : await create(payload);
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <>
      <Modal
        open={open && !pickerOpen}
        title={project ? '编辑项目' : '添加项目'}
        description={project ? '修改项目信息，保存后会重新扫描技术栈。' : '选择一个本地项目目录，工作台会自动识别其技术栈。'}
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
              disabled={submitting || !projectPath.trim() || !workspaceId}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? '保存中…' : '保存'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="项目路径" required hint="选择或填写项目根目录，保存时会自动扫描技术栈与体积">
            <div className="flex gap-2">
              <input
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="例如 D:\\code\\my-app"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <FolderSearch className="h-4 w-4" />
                浏览
              </button>
            </div>
          </Field>

          <Field label="项目名称" hint="留空则自动使用目录名">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="我的项目"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="所属工作区" required>
              <select
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {workspaces.map((w: Workspace) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="项目状态">
              <div className="flex gap-1.5">
                {(Object.keys(STATUS_META) as ProjectStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={clsx(
                      'flex-1 rounded-lg px-2 py-2 text-xs font-medium ring-1 ring-inset transition',
                      status === s ? STATUS_META[s].chip : 'text-slate-500 ring-slate-200 dark:text-slate-400 dark:ring-slate-700'
                    )}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="构建命令" hint={`留空则使用全局默认命令：${defaultBuildCommand}`}>
            <input
              value={buildCommand}
              onChange={(e) => setBuildCommand(e.target.value)}
              placeholder={defaultBuildCommand}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </Field>

          <Field label="项目描述">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="一句话描述这个项目做什么（可选）"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </Field>
        </div>
      </Modal>

      <DirectoryPicker
        open={pickerOpen}
        initialPath={projectPath || homeDir}
        onClose={() => setPickerOpen(false)}
        onSelect={(path) => {
          setProjectPath(path);
          if (!name) setName(path.split(/[\\/]/).filter(Boolean).pop() || '');
          setPickerOpen(false);
        }}
      />
    </>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}
