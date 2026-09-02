import { create } from 'zustand';
import { api } from '@/lib/api';
import { toast } from './toastStore';
import type { GitInfo, Project, ProjectStatus, SortBy, SortDir, ViewMode } from '@/types';

export interface ContextMenuState {
  x: number;
  y: number;
  projectId: string;
}

interface ProjectState {
  projects: Project[];
  loading: boolean;
  refreshingIds: string[];
  openingIds: string[];

  // 视图与筛选
  search: string;
  statuses: ProjectStatus[];
  techs: string[];
  viewMode: ViewMode;
  sortBy: SortBy;
  sortDir: SortDir;

  // 交互态
  detailId: string | null;
  editingProject: Project | null;
  formOpen: boolean;
  contextMenu: ContextMenuState | null;

  setAll: (projects: Project[]) => void;
  setLoading: (loading: boolean) => void;
  setSearch: (search: string) => void;
  toggleStatus: (status: ProjectStatus) => void;
  toggleTech: (tech: string) => void;
  clearFilters: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSort: (sortBy: SortBy, sortDir?: SortDir) => void;
  toggleSortDir: () => void;

  openDetail: (id: string | null) => void;
  openForm: (project?: Project | null) => void;
  closeForm: () => void;
  setContextMenu: (menu: ContextMenuState | null) => void;

  create: (data: Parameters<typeof api.createProject>[0]) => Promise<boolean>;
  update: (id: string, data: Partial<Project>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  refresh: (id: string) => Promise<void>;
  reorder: (workspaceId: string, ids: string[]) => Promise<void>;
  fetchGit: (id: string) => Promise<GitInfo | null>;
  openWith: (id: string, editorId?: string) => Promise<void>;
  reveal: (id: string) => Promise<void>;
  openTerminal: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  refreshingIds: [],
  openingIds: [],

  search: '',
  statuses: [],
  techs: [],
  viewMode: 'grid',
  sortBy: 'custom',
  sortDir: 'asc',

  detailId: null,
  editingProject: null,
  formOpen: false,
  contextMenu: null,

  setAll: (projects) => set({ projects }),
  setLoading: (loading) => set({ loading }),
  setSearch: (search) => set({ search }),
  toggleStatus: (status) =>
    set({ statuses: get().statuses.includes(status) ? get().statuses.filter((s) => s !== status) : [...get().statuses, status] }),
  toggleTech: (tech) =>
    set({ techs: get().techs.includes(tech) ? get().techs.filter((t) => t !== tech) : [...get().techs, tech] }),
  clearFilters: () => set({ statuses: [], techs: [], search: '' }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSort: (sortBy, sortDir) => set({ sortBy, sortDir: sortDir ?? get().sortDir }),
  toggleSortDir: () => set({ sortDir: get().sortDir === 'asc' ? 'desc' : 'asc' }),

  openDetail: (id) => set({ detailId: id }),
  openForm: (project) => set({ formOpen: true, editingProject: project ?? null }),
  closeForm: () => set({ formOpen: false, editingProject: null }),
  setContextMenu: (menu) => set({ contextMenu: menu }),

  create: async (data) => {
    try {
      const created = await api.createProject(data);
      set({ projects: [...get().projects, created], formOpen: false, editingProject: null });
      toast.success(`已添加项目「${created.name}」`);
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    }
  },

  update: async (id, data) => {
    const prev = get().projects;
    set({ projects: prev.map((p) => (p.id === id ? { ...p, ...data } : p)) });
    try {
      const updated = await api.updateProject(id, data);
      set({ projects: get().projects.map((p) => (p.id === id ? updated : p)), formOpen: false, editingProject: null });
      toast.success('项目已更新');
      return true;
    } catch (err) {
      set({ projects: prev });
      toast.error((err as Error).message);
      return false;
    }
  },

  remove: async (id) => {
    const target = get().projects.find((p) => p.id === id);
    const prev = get().projects;
    set({ projects: prev.filter((p) => p.id !== id), detailId: get().detailId === id ? null : get().detailId });
    try {
      await api.deleteProject(id);
      toast.success(`已移除项目「${target?.name ?? ''}」`);
      return true;
    } catch (err) {
      set({ projects: prev });
      toast.error((err as Error).message);
      return false;
    }
  },

  refresh: async (id) => {
    set({ refreshingIds: [...get().refreshingIds, id] });
    try {
      const updated = await api.refreshProject(id);
      set({ projects: get().projects.map((p) => (p.id === id ? updated : p)) });
      toast.success('技术栈已刷新');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      set({ refreshingIds: get().refreshingIds.filter((x) => x !== id) });
    }
  },

  reorder: async (workspaceId, ids) => {
    const prev = get().projects;
    const orderMap = new Map(ids.map((id, index) => [id, index]));
    set({
      projects: prev.map((p) => (orderMap.has(p.id) ? { ...p, order: orderMap.get(p.id) as number } : p)),
    });
    try {
      await api.reorderProjects(workspaceId, ids);
    } catch (err) {
      set({ projects: prev });
      toast.error((err as Error).message);
    }
  },

  fetchGit: async (id) => {
    try {
      return await api.getGitInfo(id);
    } catch {
      return null;
    }
  },

  openWith: async (id, editorId) => {
    const project = get().projects.find((p) => p.id === id);
    set({ openingIds: [...get().openingIds, id] });
    try {
      const res = await api.openProject(id, editorId);
      toast.success(`正在用 ${res.editor} 打开「${project?.name ?? ''}」`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setTimeout(() => set({ openingIds: get().openingIds.filter((x) => x !== id) }), 800);
    }
  },

  reveal: async (id) => {
    try {
      await api.revealProject(id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  },

  openTerminal: async (id) => {
    try {
      await api.openTerminal(id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  },
}));
