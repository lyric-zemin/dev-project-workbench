import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Dashboard from '@/pages/Dashboard';
import Settings from '@/pages/Settings';
import ToastContainer from '@/components/Toast';
import { api } from '@/lib/api';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from '@/stores/toastStore';

export default function App() {
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .bootstrap()
      .then((payload) => {
        if (!alive) return;
        useWorkspaceStore.getState().setAll(payload.workspaces);
        useProjectStore.getState().setAll(payload.projects);
        useSettingsStore.getState().hydrate({
          settings: payload.settings,
          platform: payload.platform,
          homeDir: payload.homeDir,
        });

        // 视图与排序偏好同步到项目 store
        const { viewMode, sortBy, sortDir } = payload.settings;
        useProjectStore.getState().setViewMode(viewMode);
        useProjectStore.getState().setSort(sortBy, sortDir);

        void useSettingsStore.getState().loadEditors();
        setBooted(true);
      })
      .catch((err: Error) => {
        if (!alive) return;
        setError(err.message || '无法连接到本地服务');
      });
    return () => {
      alive = false;
    };
  }, []);

  // 跟随系统主题
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      if (useSettingsStore.getState().settings.theme !== 'system') return;
      document.documentElement.classList.toggle('dark', mq.matches);
    };
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-500/30 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-rose-600 dark:text-rose-400">无法连接本地服务</h2>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
            {error}
            <br />
            请确认后端已启动：在项目根目录执行
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">npm run dev</code>
            后再刷新页面。
          </p>
          <button
            type="button"
            onClick={() => {
              toast.info('正在重试…');
              window.location.reload();
            }}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-500"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!booted) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        <p className="text-xs">正在加载工作台…</p>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
