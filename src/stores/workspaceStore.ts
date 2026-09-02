import { create } from 'zustand';
import { api } from '@/lib/api';
import { toast } from './toastStore';
import type { Workspace } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  activeId: string; // 'all' 或具体工作区 id
  loading: boolean;
  setAll: (workspaces: Workspace[]) => void;
  setActive: (id: string) => void;
  create: (data: { name: string; icon?: string; color?: string }) => Promise<Workspace | null>;
  update: (id: string, data: Partial<Workspace>) => Promise<void>;
  remove: (id: string, mode?: 'move' | 'delete') => Promise<boolean>;
  reorder: (ids: string[]) => Promise<void>;
}

const recount = (workspaces: Workspace[], projects: { workspaceId: string }[]) =>
  workspaces.map((w) => ({ ...w, projectCount: projects.filter((p) => p.workspaceId === w.id).length }));

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeId: 'all',
  loading: false,

  setAll: (workspaces) => set({ workspaces }),
  setActive: (id) => set({ activeId: id }),

  create: async (data) => {
    try {
      const created = await api.createWorkspace(data);
      set({ workspaces: [...get().workspaces, { ...created, projectCount: 0 }] });
      toast.success(`已创建工作区「${created.name}」`);
      return created;
    } catch (err) {
      toast.error((err as Error).message);
      return null;
    }
  },

  update: async (id, data) => {
    const prev = get().workspaces;
    set({ workspaces: prev.map((w) => (w.id === id ? { ...w, ...data } : w)) });
    try {
      await api.updateWorkspace(id, data);
      toast.success('工作区已更新');
    } catch (err) {
      set({ workspaces: prev });
      toast.error((err as Error).message);
    }
  },

  remove: async (id, mode = 'move') => {
    const target = get().workspaces.find((w) => w.id === id);
    if (!target) return false;
    try {
      await api.deleteWorkspace(id, { mode, moveTo: get().workspaces.find((w) => w.id !== id)?.id });
      const next = get().workspaces.filter((w) => w.id !== id);
      set({ workspaces: next, activeId: get().activeId === id ? 'all' : get().activeId });
      toast.success(`已删除工作区「${target.name}」`);
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    }
  },

  reorder: async (ids) => {
    const prev = get().workspaces;
    const next = ids
      .map((id) => prev.find((w) => w.id === id))
      .filter(Boolean)
      .map((w, index) => ({ ...(w as Workspace), order: index }));
    set({ workspaces: next });
    try {
      await api.reorderWorkspaces(ids);
    } catch (err) {
      set({ workspaces: prev });
      toast.error((err as Error).message);
    }
  },
}));

export { recount };
