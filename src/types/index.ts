/** 项目状态：开发中 / 维护中 / 已归档 */
export type ProjectStatus = 'active' | 'maintenance' | 'archived';

/** 技术栈分类 */
export type TechCategory = 'language' | 'frontend' | 'backend' | 'build' | 'tool' | 'other';

export interface TechStack {
  name: string;
  version?: string;
  category: TechCategory;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  workspaceId: string;
  status: ProjectStatus;
  description?: string;
  buildCommand?: string;
  techStack: TechStack[];
  size: number;
  createdAt: string;
  lastUpdated: string;
  updatedAt: string;
  exists?: boolean;
  order: number;
}

export interface Workspace {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  projectCount?: number;
}

export interface EditorConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  platform: string[];
  icon: string;
  custom?: boolean;
  installed?: boolean;
}

export type SortBy = 'custom' | 'name' | 'pinyin' | 'lastUpdated' | 'createdAt' | 'size';
export type SortDir = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  theme: ThemeMode;
  defaultEditorId: string;
  buildCommand: string;
  viewMode: ViewMode;
  sortBy: SortBy;
  sortDir: SortDir;
  scanMaxDepth: number;
  confirmBeforeBuild: boolean;
}

export interface GitInfo {
  hash?: string;
  author?: string;
  date?: string;
  message?: string;
  branch?: string;
  available?: boolean;
}

export interface BuildJob {
  id: string;
  projectId: string;
  projectName: string;
  command: string;
  cwd: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  exitCode: number | null;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  logs: string[];
}

export interface ScanCandidate {
  name: string;
  path: string;
  techStack?: TechStack[];
  size?: number;
  lastUpdated?: string;
  createdAt?: string;
  selected?: boolean;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isDir: boolean;
}

export interface BrowseResult {
  path: string;
  parent: string | null;
  entries: DirectoryEntry[];
}

export interface BootstrapPayload {
  workspaces: Workspace[];
  projects: Project[];
  settings: AppSettings;
  platform: string;
  homeDir: string;
}
