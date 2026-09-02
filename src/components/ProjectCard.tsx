import clsx from 'clsx';
import { AlertTriangle, Code2, FolderOpen, Hammer, Loader2, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import TechStackBadge from './TechStackBadge';
import { STATUS_META, colorClasses, formatBytes, formatRelativeTime } from '@/lib/format';
import { getIcon } from '@/lib/icons';
import type { ProjectViewProps } from './projectShared';
import type { Project } from '@/types';

const MAX_TECH = 5;

export default function ProjectCard({
  project,
  workspace,
  actions,
  dnd,
  techFilter,
  onToggleTech,
  onContextMenu,
  busy,
}: ProjectViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = STATUS_META[project.status];
  const color = colorClasses(workspace?.color || 'indigo');
  const Icon = getIcon(workspace?.icon);
  const visibleTech = project.techStack.slice(0, MAX_TECH);
  const restTech = project.techStack.length - visibleTech.length;

  const openMenu = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setMenuOpen(true);
    onContextMenu(e, project);
  };

  return (
    <article
      draggable={dnd.draggable}
      onDragStart={dnd.onDragStart}
      onDragOver={dnd.onDragOver}
      onDragLeave={dnd.onDragLeave}
      onDrop={dnd.onDrop}
      onDragEnd={dnd.onDragEnd}
      onContextMenu={(e) => onContextMenu(e, project)}
      onClick={() => actions.detail(project)}
      className={clsx(
        'card-hover group relative flex cursor-pointer flex-col rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900',
        dnd.isOver
          ? 'border-indigo-400 ring-2 ring-indigo-200 dark:border-indigo-500 dark:ring-indigo-500/30'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:hover:border-slate-700',
        dnd.isDragging && 'opacity-40',
        dnd.draggable && 'cursor-grab active:cursor-grabbing'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {visibleTech.length > 0 ? (
            visibleTech.map((tech) => (
              <TechStackBadge
                key={tech.name}
                tech={tech}
                active={techFilter.includes(tech.name)}
                onClick={onToggleTech}
              />
            ))
          ) : (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-400 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700">
              未检测到技术栈
            </span>
          )}
          {restTech > 0 && (
            <span
              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              title={project.techStack.slice(MAX_TECH).map((t) => t.name).join('、')}
            >
              +{restTech}
            </span>
          )}
        </div>
        <span className={clsx('mt-1 h-2 w-2 shrink-0 rounded-full', status.dot)} title={status.label} />
      </div>

      <h3 className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{project.name}</h3>

      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400" title={project.path}>
        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{project.path}</span>
      </p>

      {project.description && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300" title={project.description}>
          {project.description}
        </p>
      )}

      {project.exists === false && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          路径不存在，请检查或移除
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
        {workspace && (
          <span className="inline-flex items-center gap-1">
            <Icon className={clsx('h-3 w-3', color.dot.replace('bg-', 'text-'))} />
            {workspace.name}
          </span>
        )}
        <span>{formatBytes(project.size)}</span>
        <span>更新 {formatRelativeTime(project.lastUpdated)}</span>
      </div>

      <div className="mt-4 min-h-0 flex-1" />

      <div className="flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button
          type="button"
          disabled={busy.opening}
          onClick={(e) => {
            e.stopPropagation();
            actions.open(project);
          }}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy.opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Code2 className="h-3.5 w-3.5" />}
          打开
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            actions.build(project);
          }}
          title="一键打包"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Hammer className="h-3.5 w-3.5" />
          构建
        </button>
        <button
          type="button"
          onClick={(e) => openMenu(e, project)}
          aria-label="更多操作"
          className={clsx(
            'inline-flex items-center justify-center rounded-lg border border-slate-200 px-1.5 py-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
            menuOpen && 'bg-slate-100 dark:bg-slate-800'
          )}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {busy.refreshing && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
        </div>
      )}
    </article>
  );
}
