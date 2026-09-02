import type {
  AppSettings,
  BootstrapPayload,
  BrowseResult,
  BuildJob,
  EditorConfig,
  GitInfo,
  Project,
  ScanCandidate,
  Workspace,
} from '@/types';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = (body && (body as { error?: string }).error) || `请求失败（${res.status}）`;
    throw new Error(message);
  }
  return body as T;
}

const post = <T>(url: string, data?: unknown) =>
  request<T>(url, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) });
const put = <T>(url: string, data?: unknown) =>
  request<T>(url, { method: 'PUT', body: data === undefined ? undefined : JSON.stringify(data) });
const del = <T>(url: string, data?: unknown) =>
  request<T>(url, { method: 'DELETE', body: data === undefined ? undefined : JSON.stringify(data) });

export const api = {
  bootstrap: () => request<BootstrapPayload>('/api/bootstrap'),

  // 工作区
  createWorkspace: (data: { name: string; icon?: string; color?: string }) =>
    post<Workspace>('/api/workspaces', data),
  updateWorkspace: (id: string, data: Partial<Pick<Workspace, 'name' | 'icon' | 'color'>>) =>
    put<Workspace>(`/api/workspaces/${id}`, data),
  deleteWorkspace: (id: string, data?: { mode?: 'move' | 'delete'; moveTo?: string }) =>
    del<{ ok: boolean; affected: number }>(`/api/workspaces/${id}`, data),
  reorderWorkspaces: (ids: string[]) => put<{ ok: boolean }>('/api/workspaces/reorder', { ids }),

  // 项目
  createProject: (data: {
    name?: string;
    path: string;
    workspaceId: string;
    status?: Project['status'];
    description?: string;
    buildCommand?: string;
  }) => post<Project>('/api/projects', data),
  updateProject: (id: string, data: Partial<Project>) => put<Project>(`/api/projects/${id}`, data),
  deleteProject: (id: string) => del<{ ok: boolean }>(`/api/projects/${id}`),
  reorderProjects: (workspaceId: string, ids: string[]) =>
    put<{ ok: boolean }>('/api/projects/reorder', { workspaceId, ids }),
  refreshProject: (id: string) => post<Project>(`/api/projects/${id}/refresh`),
  getGitInfo: (id: string) => request<GitInfo>(`/api/projects/${id}/git`),

  // 快速操作
  openProject: (id: string, editorId?: string) => post<{ ok: boolean; editor: string }>(`/api/projects/${id}/open`, { editorId }),
  revealProject: (id: string) => post<{ ok: boolean }>(`/api/projects/${id}/reveal`),
  openTerminal: (id: string) => post<{ ok: boolean }>(`/api/projects/${id}/terminal`),

  // 构建
  startBuild: (id: string, command?: string) => post<BuildJob>(`/api/projects/${id}/build`, { command }),
  getBuild: (jobId: string) => request<BuildJob>(`/api/builds/${jobId}`),
  stopBuild: (jobId: string) => post<{ ok: boolean }>(`/api/builds/${jobId}/stop`),

  // 扫描导入
  browse: (targetPath: string) => request<BrowseResult>(`/api/fs/browse?path=${encodeURIComponent(targetPath)}`),
  roots: () => request<{ name: string; path: string; isDir: boolean }[]>('/api/fs/roots'),
  scan: (rootPath: string, maxDepth: number) =>
    post<{ rootPath: string; elapsed: number; projects: ScanCandidate[] }>('/api/scan', { rootPath, maxDepth }),
  importScan: (workspaceId: string, projects: ScanCandidate[]) =>
    post<{ imported: number; skipped: number; projects: Project[] }>('/api/scan/import', { workspaceId, projects }),

  // 编辑器 / 设置 / 数据
  getEditors: () => request<EditorConfig[]>('/api/editors'),
  createEditor: (data: { name: string; command: string }) => post<EditorConfig>('/api/editors', data),
  deleteEditor: (id: string) => del<{ ok: boolean }>(`/api/editors/${id}`),
  updateSettings: (data: Partial<AppSettings>) => put<AppSettings>('/api/settings', data),
  importData: (payload: unknown) => post<{ ok: boolean }>('/api/data/import', payload),
  exportUrl: '/api/data/export',
};

/** 订阅构建任务日志（SSE） */
export function subscribeBuild(
  jobId: string,
  handlers: {
    onSnapshot?: (job: BuildJob) => void;
    onLog?: (text: string) => void;
    onDone?: (payload: { status: string; exitCode: number | null; error: string | null }) => void;
  }
) {
  const source = new EventSource(`/api/builds/${jobId}/stream`);
  source.addEventListener('snapshot', (e) => handlers.onSnapshot?.(JSON.parse((e as MessageEvent).data)));
  source.addEventListener('log', (e) => handlers.onLog?.(JSON.parse((e as MessageEvent).data).text));
  source.addEventListener('done', (e) => handlers.onDone?.(JSON.parse((e as MessageEvent).data)));
  return () => source.close();
}
