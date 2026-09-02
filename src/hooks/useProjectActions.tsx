import { useMemo } from 'react';
import {
  Code2,
  Copy,
  FolderOpen,
  Hammer,
  Info,
  Pencil,
  PlayCircle,
  RefreshCw,
  TerminalSquare,
  Trash2,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { toast } from '@/stores/toastStore';
import type { Project } from '@/types';
import type { MenuItem } from '@/components/ContextMenu';

interface Handlers {
  onBuild: (project: Project) => void;
  onRequestDelete: (project: Project) => void;
}

export interface ProjectActions {
  open: (project: Project, editorId?: string) => void;
  build: (project: Project) => void;
  reveal: (project: Project) => void;
  terminal: (project: Project) => void;
  refresh: (project: Project) => void;
  edit: (project: Project) => void;
  detail: (project: Project) => void;
  copyPath: (project: Project) => void;
  requestDelete: (project: Project) => void;
  menuItems: (project: Project) => MenuItem[];
}

export function useProjectActions({ onBuild, onRequestDelete }: Handlers): ProjectActions {
  const openWith = useProjectStore((s) => s.openWith);
  const reveal = useProjectStore((s) => s.reveal);
  const openTerminal = useProjectStore((s) => s.openTerminal);
  const refresh = useProjectStore((s) => s.refresh);
  const openForm = useProjectStore((s) => s.openForm);
  const openDetail = useProjectStore((s) => s.openDetail);
  const editors = useSettingsStore((s) => s.editors);
  const defaultEditorId = useSettingsStore((s) => s.settings.defaultEditorId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  return useMemo<ProjectActions>(() => {
    const copyPath = (project: Project) => {
      navigator.clipboard
        ?.writeText(project.path)
        .then(() => toast.success('项目路径已复制'))
        .catch(() => toast.error('复制失败，请手动复制'));
    };

    return {
      open: (project, editorId) => void openWith(project.id, editorId),
      build: (project) => onBuild(project),
      reveal: (project) => void reveal(project.id),
      terminal: (project) => void openTerminal(project.id),
      refresh: (project) => void refresh(project.id),
      edit: (project) => openForm(project),
      detail: (project) => openDetail(project.id),
      copyPath,
      requestDelete: (project) => onRequestDelete(project),
      menuItems: (project) => {
        const items: MenuItem[] = [
          {
            key: 'detail',
            label: '查看详情',
            icon: <Info className="h-4 w-4" />,
            onClick: () => openDetail(project.id),
          },
          {
            key: 'open-default',
            label: `用${editors.find((e) => e.id === defaultEditorId)?.name || '默认编辑器'}打开`,
            icon: <Code2 className="h-4 w-4" />,
            onClick: () => void openWith(project.id),
          },
          {
            key: 'build',
            label: '一键打包',
            icon: <Hammer className="h-4 w-4" />,
            onClick: () => onBuild(project),
          },
          { key: 'd1', label: '', divider: true },
          {
            key: 'reveal',
            label: '在文件管理器中显示',
            icon: <FolderOpen className="h-4 w-4" />,
            onClick: () => void reveal(project.id),
          },
          {
            key: 'terminal',
            label: '在终端中打开',
            icon: <TerminalSquare className="h-4 w-4" />,
            onClick: () => void openTerminal(project.id),
          },
          {
            key: 'copy',
            label: '复制项目路径',
            icon: <Copy className="h-4 w-4" />,
            onClick: () => copyPath(project),
          },
          {
            key: 'refresh',
            label: '刷新技术栈',
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: () => void refresh(project.id),
          },
          {
            key: 'move',
            label: '移动到工作区',
            icon: <PlayCircle className="h-4 w-4" />,
            disabled: workspaces.length < 2,
            onClick: () => {
              const next = workspaces.find((w) => w.id !== project.workspaceId);
              if (next) {
                void useProjectStore.getState().update(project.id, { workspaceId: next.id });
                toast.info(`已移动到「${next.name}」`);
              }
            },
          },
          { key: 'd2', label: '', divider: true },
          {
            key: 'edit',
            label: '编辑项目信息',
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => openForm(project),
          },
          {
            key: 'delete',
            label: '从工作台移除',
            icon: <Trash2 className="h-4 w-4" />,
            danger: true,
            onClick: () => onRequestDelete(project),
          },
        ];
        return items;
      },
    };
  }, [editors, defaultEditorId, workspaces, openWith, reveal, openTerminal, refresh, openForm, openDetail, onBuild, onRequestDelete]);
}
