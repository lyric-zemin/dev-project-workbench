import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '@/constants/settings';
import { STORAGE_KEYS } from '@/constants/storage';
import { api } from '@/lib/api';
import { toast } from './toastStore';
import type { AppSettings, EditorConfig } from '@/types';

function applyTheme(mode: AppSettings['theme']) {
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, mode);
  } catch {
    /* 忽略隐私模式下的写入失败 */
  }
}

interface SettingsState {
  settings: AppSettings;
  editors: EditorConfig[];
  platform: string;
  homeDir: string;
  loaded: boolean;
  hydrate: (payload: { settings: AppSettings; platform: string; homeDir: string }) => void;
  patch: (data: Partial<AppSettings>) => void;
  loadEditors: () => Promise<void>;
  addEditor: (data: { name: string; command: string }) => Promise<boolean>;
  removeEditor: (id: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  editors: [],
  platform: 'win32',
  homeDir: '',
  loaded: false,

  hydrate: ({ settings, platform, homeDir }) => {
    applyTheme(settings.theme);
    set({ settings, platform, homeDir, loaded: true });
  },

  patch: (data) => {
    const next = { ...get().settings, ...data };
    set({ settings: next });
    if (data.theme) applyTheme(data.theme);
    api.updateSettings(data).catch((err: Error) => toast.error(err.message));
  },

  loadEditors: async () => {
    try {
      set({ editors: await api.getEditors() });
    } catch (err) {
      toast.error((err as Error).message);
    }
  },

  addEditor: async (data) => {
    try {
      const created = await api.createEditor(data);
      set({ editors: [...get().editors, created] });
      toast.success(`已添加编辑器「${created.name}」`);
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    }
  },

  removeEditor: async (id) => {
    const prev = get().editors;
    set({ editors: prev.filter((e) => e.id !== id) });
    try {
      await api.deleteEditor(id);
      toast.success('编辑器已删除');
    } catch (err) {
      set({ editors: prev });
      toast.error((err as Error).message);
    }
  },
}));

export { applyTheme };
