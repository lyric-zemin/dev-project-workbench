import clsx from 'clsx';
import { AlertTriangle, Code2, FolderOpen, Hammer, Loader2, MoreHorizontal } from 'lucide-react';
import TechStackBadge from './TechStackBadge';
import { STATUS_META, colorClasses, formatBytes, formatDateTime, formatRelativeTime } from '@/lib/format';
import { getIcon } from '@/lib/icons';
import type { ProjectViewProps } from './projectShared';
import type { Project } from '@/types';

const MAX_TECH = 4;

export default function ProjectListItem({
  project,
  workspace,
  actions,
  dnd,
  techFilter,
  onToggleTech,
  onContextMenu,
  busy,
}: ProjectViewProps) {
  const status = STATUS_META[project.status];
  const color = colorClasses(workspace?.color || 'indigo');
  const Icon = getIcon(workspace?.icon);
  const visibleTech = project.techStack.slice(0, MAX_TECH);
  const restTech = project.techStack.length - visibleTech.length;

  return (
    <div
      draggable={dnd.draggable}
      onDragStart={dnd.onDragStart}
      onDragOver={dnd.onDragOver}
      onDragLeave={dnd.onDragLeave}
      onDrop={dnd.onDrop}
      onDragEnd={dnd.onDragEnd}
      onContextMenu={(e) => onContextMenu(e, project)}
      onClick={() => actions.detail(project)}
      className={clsx(
        'grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-white px-3 py-2.5 transition dark:bg-slate-900 md:grid-cols-[minmax(0,2fr)_minmax(0,2.2fr)_minmax(0,1.6fr)_110px_120px_auto]',
        dnd.isOver
          ? 'border-indigo-400 ring-2 ring-indigo-200 dark:border-indigo-500 dark:ring-indigo-500/30'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:hover:border-slate-700',
        dnd.isDragging && 'opacity-40',
        dnd.draggable && 'cursor-grab active:cursor-grabbing'
      )}
    >
      {/* 名称 + 状态 + 路径（窄屏） */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={clsx('h-2 w-2 shrink-0 rounded-full', status.dot)} title={status.label} />
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={project.name}>
            {project.name}
          </span>
          {project.exists === false && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400 dark:text-slate-500 md:hidden">
          <FolderOpen className="h-3 w-3 shrink-0" />
          {project.path}
        </p>
      </div>

      {/* 技术栈 */}
      <div className="hidden min-w-0 items-center gap-1 overflow-hidden md:flex">
        {visibleTech.length ? (
          visibleTech.map((tech) => (
            <TechStackBadge
              key={tech.name}
              tech={tech}
              active={techFilter.includes(tech.name)}
              onClick={onToggleTech}
            />
          ))
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-600">-</span>
        )}
        {restTech > 0 && <span className="text-[11px] text-slate-400">+{restTech}</span>}
      </div>

      {/* 路径 */}
      <p className="hidden min-w-0 truncate text-xs text-slate-500 dark:text-slate-400 md:block" title={project.path}>
        {project.path}
      </p>

      {/* 体积 + 工作区 */}
      <div className="hidden flex-col text-[11px] text-slate-400 dark:text-slate-500 md:flex">
        <span>{formatBytes(project.size)}</span>
        {workspace && (
          <span className="inline-flex items-center gap-1 truncate">
            <Icon className={clsx('h-3 w-3', color.dot.replace('bg-', 'text-'))} />
            <span className="truncate">{workspace.name}</span>
          </span>
        )}
      </div>

      {/* 更新时间 */}
      <div className="hidden flex-col text-[11px] text-slate-400 dark:text-slate-500 md:flex" title={formatDateTime(project.lastUpdated)}>
        <span>{formatRelativeTime(project.lastUpdated)}</span>
        <span className="tabular-nums opacity-70">{formatDateTime(project.lastUpdated).slice(5, 16)}</span>
      </div>

      {/* 操作 */}
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          disabled={busy.opening}
          onClick={(e) => {
            e.stopPropagation();
            actions.open(project);
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy.opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Code2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">打开</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            actions.build(project);
          }}
          title="一键打包"
          className="inline-flex items-center rounded-lg border border-slate-200 p-1 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Hammer className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e, project as Project);
          }}
          aria-label="更多操作"
          className="inline-flex items-center rounded-lg border border-slate-200 p-1 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {busy.refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
