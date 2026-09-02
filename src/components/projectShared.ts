import type { Project, Workspace } from '@/types';
import type { ProjectActions } from '@/hooks/useProjectActions';

export interface DndState {
  draggable: boolean;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export interface ProjectViewProps {
  project: Project;
  workspace?: Workspace;
  actions: ProjectActions;
  dnd: DndState;
  techFilter: string[];
  onToggleTech: (tech: string) => void;
  onContextMenu: (e: React.MouseEvent, project: Project) => void;
  busy: { opening: boolean; refreshing: boolean };
}
