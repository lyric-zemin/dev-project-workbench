import { useState, type ReactNode } from 'react';
import ProjectCard from './ProjectCard';
import ProjectListItem from './ProjectListItem';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { ProjectActions } from '@/hooks/useProjectActions';
import type { Project, ViewMode } from '@/types';

interface ProjectGridProps {
  projects: Project[];
  actions: ProjectActions;
  viewMode: ViewMode;
  sortable: boolean;
  onReorder: (ids: string[]) => void;
  onContextMenu: (e: React.MouseEvent, project: Project) => void;
  emptyState?: ReactNode;
}

export default function ProjectGrid({
  projects,
  actions,
  viewMode,
  sortable,
  onReorder,
  onContextMenu,
  emptyState,
}: ProjectGridProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const techFilter = useProjectStore((s) => s.techs);
  const toggleTech = useProjectStore((s) => s.toggleTech);
  const refreshingIds = useProjectStore((s) => s.refreshingIds);
  const openingIds = useProjectStore((s) => s.openingIds);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId || !sortable) return;
    const ids = projects.map((p) => p.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    onReorder(ids);
  };

  const buildDnd = (project: Project) => ({
    draggable: sortable,
    isDragging: dragId === project.id,
    isOver: overId === project.id && dragId !== project.id,
    onDragStart: (e: React.DragEvent) => {
      setDragId(project.id);
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', project.id);
      } catch {
        /* noop */
      }
    },
    onDragOver: (e: React.DragEvent) => {
      if (!sortable || !dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverId(project.id);
    },
    onDragLeave: () => setOverId((cur) => (cur === project.id ? null : cur)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      handleDrop(project.id);
      setDragId(null);
      setOverId(null);
    },
    onDragEnd: () => {
      setDragId(null);
      setOverId(null);
    },
  });

  if (!projects.length && emptyState) return <>{emptyState}</>;

  const shared = {
    actions,
    techFilter,
    onToggleTech: toggleTech,
    onContextMenu,
  };

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {projects.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            workspace={workspaces.find((w) => w.id === project.workspaceId)}
            dnd={buildDnd(project)}
            busy={{
              opening: openingIds.includes(project.id),
              refreshing: refreshingIds.includes(project.id),
            }}
            {...shared}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          workspace={workspaces.find((w) => w.id === project.workspaceId)}
          dnd={buildDnd(project)}
          busy={{
            opening: openingIds.includes(project.id),
            refreshing: refreshingIds.includes(project.id),
          }}
          {...shared}
        />
      ))}
    </div>
  );
}
