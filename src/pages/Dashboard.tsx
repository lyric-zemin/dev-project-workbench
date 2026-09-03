import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, FolderSearch, Plus, SearchX } from 'lucide-react';
import TopBar from '@/components/TopBar';
import StatusBar from '@/components/StatusBar';
import WorkspaceNav from '@/components/WorkspaceNav';
import SearchFilter from '@/components/SearchFilter';
import ProjectGrid from '@/components/ProjectGrid';
import ProjectDetailDrawer from '@/components/ProjectDetailDrawer';
import ProjectFormModal from '@/components/ProjectFormModal';
import WorkspaceFormModal from '@/components/WorkspaceFormModal';
import ScanModal from '@/components/ScanModal';
import BuildLogModal from '@/components/BuildLogModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import ContextMenu from '@/components/ContextMenu';
import { useProjectActions } from '@/hooks/useProjectActions';
import { useHotkeys } from '@/hooks/useHotkeys';
import { filterProjects, sortProjects } from '@/lib/filters';
import { api } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { BuildJob, Project, Workspace } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();

  const projects = useProjectStore((s) => s.projects);
  const search = useProjectStore((s) => s.search);
  const setSearch = useProjectStore((s) => s.setSearch);
  const statuses = useProjectStore((s) => s.statuses);
  const toggleStatus = useProjectStore((s) => s.toggleStatus);
  const techs = useProjectStore((s) => s.techs);
  const toggleTech = useProjectStore((s) => s.toggleTech);
  const clearFilters = useProjectStore((s) => s.clearFilters);
  const viewMode = useProjectStore((s) => s.viewMode);
  const setViewMode = useProjectStore((s) => s.setViewMode);
  const sortBy = useProjectStore((s) => s.sortBy);
  const sortDir = useProjectStore((s) => s.sortDir);
  const setSort = useProjectStore((s) => s.setSort);
  const reorderProjects = useProjectStore((s) => s.reorder);
  const openForm = useProjectStore((s) => s.openForm);
  const formOpen = useProjectStore((s) => s.formOpen);
  const closeForm = useProjectStore((s) => s.closeForm);
  const editingProject = useProjectStore((s) => s.editingProject);
  const detailId = useProjectStore((s) => s.detailId);
  const openDetail = useProjectStore((s) => s.openDetail);
  const contextMenu = useProjectStore((s) => s.contextMenu);
  const setContextMenu = useProjectStore((s) => s.setContextMenu);
  const refreshingAll = useProjectStore((s) => s.refreshingAll);

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeId);

  const settings = useSettingsStore((s) => s.settings);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState<{ open: boolean; workspace: Workspace | null }>({
    open: false,
    workspace: null,
  });
  const [scanOpen, setScanOpen] = useState(false);
  const [pendingDeleteProject, setPendingDeleteProject] = useState<Project | null>(null);
  const [pendingDeleteWorkspace, setPendingDeleteWorkspace] = useState<Workspace | null>(null);
  const [buildTarget, setBuildTarget] = useState<Project | null>(null);
  const [buildJob, setBuildJob] = useState<BuildJob | null>(null);
  const [buildProject, setBuildProject] = useState<Project | null>(null);

  const startBuild = useCallback(async (project: Project) => {
    const command = (project.buildCommand || useSettingsStore.getState().settings.buildCommand || '').trim();
    if (!command) {
      toast.error('未配置构建命令，请在设置或项目表单中填写');
      return;
    }
    try {
      const job = await api.startBuild(project.id, command);
      setBuildJob(job);
      setBuildProject(project);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, []);

  const requestBuild = useCallback(
    (project: Project) => {
      if (useSettingsStore.getState().settings.confirmBeforeBuild) {
        setBuildTarget(project);
      } else {
        void startBuild(project);
      }
    },
    [startBuild]
  );

  const actions = useProjectActions({
    onBuild: requestBuild,
    onRequestDelete: setPendingDeleteProject,
  });

  useHotkeys({
    onSearch: () => {
      const el = searchInputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    },
    onNew: () => openForm(null),
    onSettings: () => navigate('/settings'),
  });

  // 构建进行中离开页面时给出提示
  useEffect(() => {
    if (buildJob?.status !== 'running') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [buildJob?.status]);

  // 切回页面 / 窗口聚焦时静默刷新当前范围的核心状态（size/lastUpdated/exists），15s 频控避免抖动
  useEffect(() => {
    let lastRun = 0;
    const run = () => {
      const now = Date.now();
      if (now - lastRun < 15000) return;
      lastRun = now;
      const activeId = useWorkspaceStore.getState().activeId;
      void useProjectStore.getState().refreshAll(activeId === 'all' ? undefined : activeId, { silent: true });
    };
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);
    return () => {
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
    };
  }, []);

  const visibleProjects = useMemo(() => {
    const filtered = filterProjects(projects, { workspaceId: activeWorkspaceId, search, statuses, techs });
    return sortProjects(filtered, sortBy, sortDir);
  }, [projects, activeWorkspaceId, search, statuses, techs, sortBy, sortDir]);

  const detailProject = detailId ? (projects.find((p) => p.id === detailId) ?? null) : null;
  const contextProject = contextMenu ? (projects.find((p) => p.id === contextMenu.projectId) ?? null) : null;

  const handleReorder = (ids: string[]) => {
    const workspaceId = activeWorkspaceId === 'all' ? (visibleProjects[0]?.workspaceId ?? '') : activeWorkspaceId;
    void reorderProjects(workspaceId, ids);
  };

  const applyViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    void useSettingsStore.getState().patch({ viewMode: mode });
  };

  const applySort = (by: typeof sortBy, dir?: typeof sortDir) => {
    setSort(by, dir);
    void useSettingsStore.getState().patch({ sortBy: by, sortDir: dir ?? sortDir });
  };

  const emptyState =
    projects.length === 0 ? (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-20 text-center dark:border-slate-700">
        <FolderPlus className="h-10 w-10 text-slate-300 dark:text-slate-600" />
        <h3 className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">工作台还没有项目</h3>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
          添加第一个项目，或扫描一个父目录批量导入，工作台会自动识别技术栈。
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => openForm(null)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            添加项目
          </button>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FolderSearch className="h-4 w-4" />
            扫描导入
          </button>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-20 text-center dark:border-slate-700">
        <SearchX className="h-10 w-10 text-slate-300 dark:text-slate-600" />
        <h3 className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">没有匹配的项目</h3>
        <p className="mt-1 text-xs text-slate-400">试试调整搜索关键词或清空过滤条件。</p>
        <button
          type="button"
          onClick={clearFilters}
          className="mt-4 rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          清空过滤条件
        </button>
      </div>
    );

  return (
    <div className="flex h-full flex-col">
      <TopBar
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onNewProject={() => openForm(null)}
        onScan={() => setScanOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        {/* 侧边栏：桌面常驻 */}
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-slate-50/60 py-4 dark:border-slate-800 dark:bg-slate-950/40 lg:flex lg:flex-col">
          <WorkspaceNav
            onCreate={() => setWorkspaceForm({ open: true, workspace: null })}
            onEdit={(ws) => setWorkspaceForm({ open: true, workspace: ws })}
            onDelete={(ws) => setPendingDeleteWorkspace(ws)}
          />
        </aside>

        {/* 侧边栏：移动端抽屉 */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white py-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <WorkspaceNav
                onCreate={() => setWorkspaceForm({ open: true, workspace: null })}
                onEdit={(ws) => setWorkspaceForm({ open: true, workspace: ws })}
                onDelete={(ws) => setPendingDeleteWorkspace(ws)}
                onNavigate={() => setSidebarOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* 主区域 */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
            <div className="mb-5">
              <SearchFilter
                projects={projects}
                visibleCount={visibleProjects.length}
                search={search}
                onSearch={setSearch}
                inputRef={searchInputRef}
                statuses={statuses}
                onToggleStatus={toggleStatus}
                techs={techs}
                onToggleTech={toggleTech}
                onClear={clearFilters}
                onRefreshAll={() => void useProjectStore.getState().refreshAll()}
                refreshingAll={refreshingAll}
                viewMode={viewMode}
                onViewMode={applyViewMode}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={applySort}
                onToggleSortDir={() => applySort(sortBy, sortDir === 'asc' ? 'desc' : 'asc')}
              />
            </div>

            <ProjectGrid
              projects={visibleProjects}
              actions={actions}
              viewMode={viewMode}
              sortable={sortBy === 'custom'}
              onReorder={handleReorder}
              onContextMenu={(e, project) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, projectId: project.id });
              }}
              emptyState={emptyState}
            />

            {/* 快捷键提示 */}
            <p className="mt-8 text-center text-[11px] text-slate-300 dark:text-slate-700">
              Ctrl/⌘ + F 搜索 · Ctrl/⌘ + N 新建项目 · Ctrl/⌘ + S 设置 · 右键卡片查看更多操作
            </p>
          </div>
        </main>
      </div>

      <StatusBar visibleCount={visibleProjects.length} />

      {/* 详情抽屉 */}
      <ProjectDetailDrawer
        project={detailProject}
        actions={actions}
        onClose={() => openDetail(null)}
        onBuild={requestBuild}
      />

      {/* 右键菜单 */}
      {contextMenu && contextProject && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={actions.menuItems(contextProject)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 各类弹窗 */}
      <ProjectFormModal open={formOpen} project={editingProject} onClose={closeForm} />
      <WorkspaceFormModal
        open={workspaceForm.open}
        workspace={workspaceForm.workspace}
        onClose={() => setWorkspaceForm({ open: false, workspace: null })}
      />
      <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} />
      <BuildLogModal
        open={Boolean(buildJob)}
        job={buildJob}
        project={buildProject}
        onStatusChange={(status) => setBuildJob((cur) => (cur ? { ...cur, status } : cur))}
        onClose={() => {
          setBuildJob(null);
          setBuildProject(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteProject)}
        title="移除项目"
        message={
          <>
            确定要从工作台移除「{pendingDeleteProject?.name}」吗？
            <br />
            <span className="text-slate-400">仅移除工作台中的记录，不会删除磁盘上的文件。</span>
          </>
        }
        confirmText="移除"
        onCancel={() => setPendingDeleteProject(null)}
        onConfirm={() => {
          if (pendingDeleteProject) void useProjectStore.getState().remove(pendingDeleteProject.id);
          setPendingDeleteProject(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(buildTarget)}
        title="执行构建"
        danger={false}
        confirmText="开始构建"
        message={
          <>
            即将在「{buildTarget?.name}」中执行：
            <br />
            <code className="mt-2 block rounded bg-slate-100 px-2 py-1.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {buildTarget?.buildCommand || settings.buildCommand}
            </code>
          </>
        }
        onCancel={() => setBuildTarget(null)}
        onConfirm={() => {
          if (buildTarget) void startBuild(buildTarget);
          setBuildTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteWorkspace)}
        title="删除工作区"
        message={
          <>
            确定删除工作区「{pendingDeleteWorkspace?.name}」吗？
            <br />
            <span className="text-slate-400">
              该工作区下的 {pendingDeleteWorkspace ? projects.filter((p) => p.workspaceId === pendingDeleteWorkspace.id).length : 0} 个项目会移动到第一个剩余工作区，不会被删除。
            </span>
          </>
        }
        confirmText="删除工作区"
        onCancel={() => setPendingDeleteWorkspace(null)}
        onConfirm={() => {
          if (pendingDeleteWorkspace) void useWorkspaceStore.getState().remove(pendingDeleteWorkspace.id, 'move');
          setPendingDeleteWorkspace(null);
        }}
      />
    </div>
  );
}
