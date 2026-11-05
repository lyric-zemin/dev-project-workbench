import { create } from 'zustand';
import { api } from '@/lib/api';
import { toast } from './toastStore';
import { useProjectStore } from './projectStore';
import { useSettingsStore } from './settingsStore';
import type { Workspace } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  activeId: string; // 'all' 或具体工作区 id
  loading: boolean;
  setAll: (workspaces: Workspace[]) => void;
  setActive: (id: string) => void;
  restoreActive: (savedId: string) => void;
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

  /**
   * 切换当前工作区，并同步写入设置以便下次启动恢复。
   * 复用 settingsStore.patch 的持久化链路，不额外引入存储。
   */
  setActive: (id) => {
    set({ activeId: id });
    if (useSettingsStore.getState().settings.activeWorkspaceId !== id) {
      useSettingsStore.getState().patch({ activeWorkspaceId: id });
    }
  },

  /**
   * 启动/导入数据后按持久化 id 恢复选中工作区。
   * 记录缺失或对应工作区已不存在时静默回退到「全部」，避免空白或报错。
   */
  restoreActive: (savedId) => {
    const exists = savedId === 'all' || get().workspaces.some((w) => w.id === savedId);
    set({ activeId: exists ? savedId : 'all' });
  },

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
      const wasActive = get().activeId === id;
      set({ workspaces: next });
      // 删除的是当前工作区时回退到「全部」并持久化
      if (wasActive) get().setActive('all');
      if (mode === 'delete') useProjectStore.getState().removeByWorkspace(id);
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
