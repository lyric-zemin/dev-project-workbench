import { Cpu, FolderTree, Layers } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatBytes } from '@/lib/format';

interface StatusBarProps {
  visibleCount: number;
}

export default function StatusBar({ visibleCount }: StatusBarProps) {
  const projects = useProjectStore((s) => s.projects);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const platform = useSettingsStore((s) => s.platform);

  const totalSize = projects.reduce((sum, p) => sum + (p.size || 0), 0);
  const activeName = activeId === 'all' ? '全部项目' : (workspaces.find((w) => w.id === activeId)?.name ?? '全部项目');

  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-slate-200 bg-white/80 px-4 text-[11px] text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <span className="inline-flex items-center gap-1">
        <Layers className="h-3 w-3" />
        {activeName}
      </span>
      <span className="inline-flex items-center gap-1">
        <FolderTree className="h-3 w-3" />
        {visibleCount} / {projects.length} 个项目
      </span>
      <span className="hidden sm:inline">占用 {formatBytes(totalSize)}</span>
      <span className="ml-auto inline-flex items-center gap-1">
        <Cpu className="h-3 w-3" />
        {platform} · 本地存储
      </span>
    </footer>
  );
}
