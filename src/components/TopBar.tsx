import { useNavigate } from 'react-router-dom';
import { Menu, Plus, ScanLine, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useSettingsStore } from '@/stores/settingsStore';
import { THEME_OPTIONS } from '@/constants/theme';

interface TopBarProps {
  onToggleSidebar: () => void;
  onNewProject: () => void;
  onScan: () => void;
}

export default function TopBar({ onToggleSidebar, onNewProject, onScan }: TopBarProps) {
  const navigate = useNavigate();
  const theme = useSettingsStore((s) => s.settings.theme);
  const patch = useSettingsStore((s) => s.patch);

  const cycleTheme = () => {
    const index = THEME_OPTIONS.findIndex((o) => o.value === theme);
    patch({ theme: THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length].value });
  };

  const ThemeIcon = THEME_OPTIONS.find((o) => o.value === theme)!.icon;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="切换工作区导航"
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
          D
        </span>
        <div className="hidden sm:block">
          <h1 className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">开发者项目管理工作台</h1>
          <p className="text-[11px] leading-tight text-slate-400">Dev Project Workbench</p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onScan}
          className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 sm:inline-flex dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ScanLine className="h-3.5 w-3.5" />
          扫描导入
        </button>

        <button
          type="button"
          onClick={onNewProject}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">新建项目</span>
        </button>

        <button
          type="button"
          onClick={cycleTheme}
          title={`当前主题：${THEME_OPTIONS.find((o) => o.value === theme)?.label ?? '跟随系统'}`}
          aria-label="切换主题"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ThemeIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          aria-label="设置"
          className={clsx(
            'rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          )}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
