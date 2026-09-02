/**
 * 本地数据持久化（JSON 文件）。
 * 数据仅保存在用户本机，不上传任何服务器。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_EDITORS } from './services/editorCommands.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Electron 打包后 server/ 处于只读的 resources 目录，数据需写入用户可写目录。
// 通过环境变量 DWB_DATA_DIR 注入（electron/main.js 会使用 app.getPath('userData')）。
export const DATA_DIR =
  process.env.DWB_DATA_DIR && process.env.DWB_DATA_DIR.trim()
    ? process.env.DWB_DATA_DIR
    : path.join(__dirname, 'data');
export const DB_FILE = path.join(DATA_DIR, 'store.json');

export const nowISO = () => new Date().toISOString();
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const DEFAULT_SETTINGS = {
  theme: 'system',
  defaultEditorId: 'vscode',
  buildCommand: 'npm run build',
  viewMode: 'grid',
  sortBy: 'custom',
  sortDir: 'asc',
  scanMaxDepth: 3,
  confirmBeforeBuild: true,
};

function defaultData() {
  const ts = nowISO();
  return {
    version: 1,
    workspaces: [
      { id: 'ws_personal', name: '个人项目', icon: 'User', color: 'indigo', order: 0, createdAt: ts, updatedAt: ts },
      { id: 'ws_company', name: '公司项目', icon: 'Building2', color: 'sky', order: 1, createdAt: ts, updatedAt: ts },
      { id: 'ws_oss', name: '开源项目', icon: 'Globe', color: 'emerald', order: 2, createdAt: ts, updatedAt: ts },
    ],
    projects: [],
    editors: DEFAULT_EDITORS.map((e) => ({ ...e })),
    settings: { ...DEFAULT_SETTINGS },
  };
}

let cache = null;
let writeTimer = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalize(data) {
  const base = defaultData();
  const merged = { ...base, ...data };
  merged.workspaces = Array.isArray(data?.workspaces) ? data.workspaces : base.workspaces;
  merged.projects = Array.isArray(data?.projects) ? data.projects : base.projects;
  merged.editors = Array.isArray(data?.editors) && data.editors.length ? data.editors : base.editors;
  merged.settings = { ...base.settings, ...(data?.settings || {}) };
  merged.workspaces.forEach((w, i) => {
    w.order = typeof w.order === 'number' ? w.order : i;
    w.color = w.color || 'indigo';
    w.icon = w.icon || 'Folder';
  });
  merged.projects.forEach((p, i) => {
    p.order = typeof p.order === 'number' ? p.order : i;
    p.techStack = Array.isArray(p.techStack) ? p.techStack : [];
    p.status = p.status || 'active';
    p.size = typeof p.size === 'number' ? p.size : 0;
  });
  return merged;
}

export function load() {
  if (cache) return cache;
  ensureDir();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      cache = normalize(JSON.parse(raw));
    } else {
      cache = defaultData();
      persistNow();
    }
  } catch (err) {
    console.error('[store] 读取数据失败，使用默认数据:', err.message);
    cache = defaultData();
  }
  return cache;
}

function persistNow() {
  ensureDir();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

/** 防抖写入，避免高频操作重复落盘 */
export function persist() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try {
      persistNow();
    } catch (err) {
      console.error('[store] 写入数据失败:', err.message);
    }
  }, 120);
}

export function persistSync() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  persistNow();
}

export function getWorkspaces() {
  return load().workspaces.slice().sort((a, b) => a.order - b.order);
}

export function getProjects() {
  return load().projects;
}

export function getSettings() {
  return load().settings;
}

export function getEditors() {
  return load().editors;
}

export function replaceAll(data) {
  cache = normalize(data);
  persistSync();
  return cache;
}
