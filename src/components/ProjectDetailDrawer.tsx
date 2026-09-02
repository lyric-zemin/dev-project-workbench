import { useEffect, useState } from 'react';
import {
  Clock,
  Code2,
  Copy,
  FileStack,
  FolderOpen,
  GitCommitHorizontal,
  Hammer,
  HardDrive,
  Layers,
  RefreshCw,
  TerminalSquare,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import TechStackBadge from './TechStackBadge';
import { CATEGORY_META, STATUS_META, colorClasses, formatBytes, formatDateTime, formatRelativeTime } from '@/lib/format';
import { getIcon } from '@/lib/icons';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { toast } from '@/stores/toastStore';
import type { GitInfo, Project } from '@/types';
import type { ProjectActions } from '@/hooks/useProjectActions';

interface ProjectDetailDrawerProps {
  project: Project | null;
  actions: ProjectActions;
  onClose: () => void;
  onBuild: (project: Project) => void;
}

export default function ProjectDetailDrawer({ project, actions, onClose, onBuild }: ProjectDetailDrawerProps) {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const fetchGit = useProjectStore((s) => s.fetchGit);
  const refreshingIds = useProjectStore((s) => s.refreshingIds);
  const [git, setGit] = useState<GitInfo | null>(null);
  const [gitLoading, setGitLoading] = useState(false);

  useEffect(() => {
    if (!project) return;
    setGit(null);
    setGitLoading(true);
    let alive = true;
    fetchGit(project.id).then((info) => {
      if (!alive) return;
      setGit(info && info.hash ? info : null);
      setGitLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [project?.id]);

  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [project, onClose]);

  if (!project) return null;

  const workspace = workspaces.find((w) => w.id === project.workspaceId);
  const color = colorClasses(workspace?.color || 'indigo');
  const Icon = getIcon(workspace?.icon);
  const status = STATUS_META[project.status];

  const grouped = (Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[])
    .map((category) => ({
      category,
      items: project.techStack.filter((t) => t.category === category),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px] lg:hidden" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl animate-slide-in-right dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={clsx('h-2 w-2 rounded-full', status.dot)} />
              <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{project.name}</h2>
            </div>
            <p className={clsx('mt-1 text-xs', status.chip.split(' ')[1] || 'text-slate-400')}>{status.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭详情"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {project.description && (
            <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
              {project.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => actions.open(project)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              <Code2 className="h-4 w-4" />
              打开项目
            </button>
            <button
              type="button"
              onClick={() => onBuild(project)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Hammer className="h-4 w-4" />
              打包
            </button>
          </div>

          <Section title="基本信息">
            <InfoRow
              icon={<FolderOpen className="h-3.5 w-3.5" />}
              label="项目路径"
              value={project.path}
              action={
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(project.path).then(
                      () => toast.success('路径已复制'),
                      () => toast.error('复制失败')
                    );
                  }}
                  className="text-slate-400 transition hover:text-indigo-500"
                >
                  <Copy className="h-3 w-3" />
                </button>
              }
            />
            <InfoRow
              icon={<Icon className={clsx('h-3.5 w-3.5', color.dot.replace('bg-', 'text-'))} />}
              label="所属工作区"
              value={workspace?.name ?? '未分配'}
            />
            <InfoRow icon={<HardDrive className="h-3.5 w-3.5" />} label="项目体积" value={formatBytes(project.size)} />
            <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="创建时间" value={formatDateTime(project.createdAt)} />
            <InfoRow
              icon={<Clock className="h-3.5 w-3.5" />}
              label="最后更新"
              value={`${formatDateTime(project.lastUpdated)}（${formatRelativeTime(project.lastUpdated)}）`}
            />
            {project.buildCommand && (
              <InfoRow
                icon={<TerminalSquare className="h-3.5 w-3.5" />}
                label="构建命令"
                value={project.buildCommand}
                mono
              />
            )}
          </Section>

          <Section
            title="技术栈"
            action={
              <button
                type="button"
                onClick={() => actions.refresh(project)}
                className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-indigo-500"
              >
                <RefreshCw className={clsx('h-3 w-3', refreshingIds.includes(project.id) && 'animate-spin')} />
                重新检测
              </button>
            }
          >
            {grouped.length === 0 && <p className="text-xs text-slate-400">未检测到技术栈，可点击「重新检测」。</p>}
            <div className="space-y-3">
              {grouped.map((group) => (
                <div key={group.category}>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {CATEGORY_META[group.category].label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((tech) => (
                      <TechStackBadge key={tech.name} tech={tech} size="md" showCategory={false} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="最近提交" action={<GitCommitHorizontal className="h-3.5 w-3.5 text-slate-400" />}>
            {gitLoading && <p className="text-xs text-slate-400">正在读取 Git 信息…</p>}
            {!gitLoading && !git && (
              <p className="text-xs text-slate-400">未检测到 Git 仓库或本机未安装 Git。</p>
            )}
            {!gitLoading && git && (
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {git.hash}
                  </span>
                  {git.branch && (
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                      {git.branch}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{git.message}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {git.author} · {git.date ? formatDateTime(git.date) : ''}
                </p>
              </div>
            )}
          </Section>

          <Section title="其他操作">
            <div className="grid grid-cols-2 gap-2">
              <MiniButton onClick={() => actions.reveal(project)} icon={<FolderOpen className="h-3.5 w-3.5" />}>
                文件管理器
              </MiniButton>
              <MiniButton onClick={() => actions.terminal(project)} icon={<TerminalSquare className="h-3.5 w-3.5" />}>
                打开终端
              </MiniButton>
              <MiniButton onClick={() => actions.edit(project)} icon={<Layers className="h-3.5 w-3.5" />}>
                编辑信息
              </MiniButton>
              <MiniButton onClick={() => actions.copyPath(project)} icon={<FileStack className="h-3.5 w-3.5" />}>
                复制路径
              </MiniButton>
            </div>
          </Section>
        </div>
      </aside>
    </>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <span className="w-20 shrink-0 text-xs text-slate-400">{label}</span>
      <span className={clsx('min-w-0 flex-1 break-all text-xs text-slate-700 dark:text-slate-200', mono && 'font-mono')}>
        {value}
      </span>
      {action}
    </div>
  );
}

function MiniButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {icon}
      {children}
    </button>
  );
}
