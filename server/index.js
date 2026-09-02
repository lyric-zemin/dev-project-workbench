/**
 * 开发者项目管理工作台 - 本地服务
 * 提供工作区/项目管理、技术栈扫描、编辑器唤起、构建执行等能力。
 * 所有数据仅保存在本机（server/data/store.json）。
 */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import * as store from './store.js';
import { detectTechStack, getProjectMeta, getGitInfo } from './services/techStackDetect.js';
import { getEditors, openWithEditor, revealInExplorer, openInTerminal, clearEditorCache } from './services/editorCommands.js';
import { scanDirectory, enrichCandidates, browseDirectory, listDrives, normalizePath } from './services/projectScanner.js';
import { startBuild, stopBuild, getJob, serializeJob, listJobs, subscribeJob } from './services/buildRunner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5177);
const DIST_DIR = path.join(__dirname, '..', 'dist');

const app = express();
app.use(express.json({ limit: '10mb' }));

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const httpError = (status, message) => Object.assign(new Error(message), { status });

/* ------------------------------------------------------------------ */
/* 工作区                                                              */
/* ------------------------------------------------------------------ */

function workspacesWithCount() {
  const projects = store.getProjects();
  return store.getWorkspaces().map((w) => ({
    ...w,
    projectCount: projects.filter((p) => p.workspaceId === w.id).length,
  }));
}

app.get('/api/bootstrap', (_req, res) => {
  res.json({
    workspaces: workspacesWithCount(),
    projects: store.getProjects(),
    settings: store.getSettings(),
    platform: process.platform,
    homeDir: os.homedir(),
  });
});

app.get('/api/workspaces', (_req, res) => res.json(workspacesWithCount()));

app.post('/api/workspaces', (req, res) => {
  const db = store.load();
  const { name, icon = 'Folder', color = 'indigo' } = req.body || {};
  if (!name || !String(name).trim()) throw httpError(400, '工作区名称不能为空');
  const ws = {
    id: store.uid('ws'),
    name: String(name).trim(),
    icon,
    color,
    order: db.workspaces.length ? Math.max(...db.workspaces.map((w) => w.order)) + 1 : 0,
    createdAt: store.nowISO(),
    updatedAt: store.nowISO(),
  };
  db.workspaces.push(ws);
  store.persist();
  res.status(201).json(ws);
});

app.put('/api/workspaces/reorder', (req, res) => {
  const db = store.load();
  const ids = (req.body?.ids || []).filter(Boolean);
  if (!ids.length) throw httpError(400, '排序数据为空');
  ids.forEach((id, index) => {
    const ws = db.workspaces.find((w) => w.id === id);
    if (ws) ws.order = index;
  });
  db.workspaces.sort((a, b) => a.order - b.order);
  store.persist();
  res.json({ ok: true });
});

app.put('/api/workspaces/:id', (req, res) => {
  const db = store.load();
  const ws = db.workspaces.find((w) => w.id === req.params.id);
  if (!ws) throw httpError(404, '工作区不存在');
  const { name, icon, color } = req.body || {};
  if (name !== undefined) {
    if (!String(name).trim()) throw httpError(400, '工作区名称不能为空');
    ws.name = String(name).trim();
  }
  if (icon !== undefined) ws.icon = icon;
  if (color !== undefined) ws.color = color;
  ws.updatedAt = store.nowISO();
  store.persist();
  res.json(ws);
});

app.delete('/api/workspaces/:id', (req, res) => {
  const db = store.load();
  const target = db.workspaces.find((w) => w.id === req.params.id);
  if (!target) throw httpError(404, '工作区不存在');
  const { mode = 'move', moveTo } = req.body || {};
  const affected = db.projects.filter((p) => p.workspaceId === target.id);
  if (mode === 'delete') {
    db.projects = db.projects.filter((p) => p.workspaceId !== target.id);
  } else {
    const dest = moveTo && db.workspaces.some((w) => w.id === moveTo)
      ? moveTo
      : db.workspaces.filter((w) => w.id !== target.id)[0]?.id;
    if (!dest) throw httpError(400, '至少需要保留一个工作区');
    affected.forEach((p) => {
      p.workspaceId = dest;
    });
  }
  db.workspaces = db.workspaces.filter((w) => w.id !== target.id);
  db.workspaces.forEach((w, i) => {
    w.order = i;
  });
  store.persist();
  res.json({ ok: true, affected: affected.length });
});

/* ------------------------------------------------------------------ */
/* 项目                                                                */
/* ------------------------------------------------------------------ */

async function buildProjectPayload(input) {
  const projectPath = path.resolve(input.path);
  let exists = false;
  try {
    exists = fs.statSync(projectPath).isDirectory();
  } catch {
    exists = false;
  }

  let techStack = [];
  let meta = { size: 0, lastUpdated: new Date().toISOString(), createdAt: new Date().toISOString() };
  if (exists) {
    const [tech, m] = await Promise.all([detectTechStack(projectPath), getProjectMeta(projectPath)]);
    techStack = tech;
    meta = m;
  }

  return {
    techStack,
    size: meta.size,
    lastUpdated: meta.lastUpdated,
    createdAt: meta.createdAt,
    exists,
  };
}

app.post('/api/projects', asyncHandler(async (req, res) => {
  const db = store.load();
  const { name, path: projectPath, workspaceId, status = 'active', description = '', buildCommand = '' } = req.body || {};
  if (!projectPath || !String(projectPath).trim()) throw httpError(400, '项目路径不能为空');
  const resolved = path.resolve(String(projectPath).trim());
  if (!db.workspaces.some((w) => w.id === workspaceId)) throw httpError(400, '请选择有效的工作区');

  const sameWs = db.projects.filter((p) => p.workspaceId === workspaceId);
  const duplicate = db.projects.find((p) => path.resolve(p.path) === resolved);
  if (duplicate) throw httpError(409, `项目已存在：${duplicate.name}`);

  const scanned = await buildProjectPayload({ path: resolved });
  const project = {
    id: store.uid('prj'),
    name: (name && String(name).trim()) || path.basename(resolved),
    path: resolved,
    workspaceId,
    status: ['active', 'maintenance', 'archived'].includes(status) ? status : 'active',
    description: String(description || '').slice(0, 500),
    buildCommand: String(buildCommand || '').trim(),
    techStack: scanned.techStack,
    size: scanned.size,
    createdAt: scanned.createdAt,
    lastUpdated: scanned.lastUpdated,
    updatedAt: store.nowISO(),
    exists: scanned.exists,
    order: sameWs.length ? Math.max(...sameWs.map((p) => p.order)) + 1 : 0,
  };
  db.projects.push(project);
  store.persist();
  res.status(201).json(project);
}));

app.put('/api/projects/reorder', (req, res) => {
  const db = store.load();
  const { workspaceId, ids = [] } = req.body || {};
  ids.forEach((id, index) => {
    const p = db.projects.find((x) => x.id === id);
    if (p && (!workspaceId || p.workspaceId === workspaceId)) p.order = index;
  });
  store.persist();
  res.json({ ok: true });
});

app.put('/api/projects/:id', asyncHandler(async (req, res) => {
  const db = store.load();
  const project = db.projects.find((p) => p.id === req.params.id);
  if (!project) throw httpError(404, '项目不存在');
  const { name, path: newPath, workspaceId, status, description, buildCommand } = req.body || {};

  if (newPath !== undefined && path.resolve(newPath) !== path.resolve(project.path)) {
    const resolved = path.resolve(String(newPath).trim());
    const duplicate = db.projects.find((p) => p.id !== project.id && path.resolve(p.path) === resolved);
    if (duplicate) throw httpError(409, `项目已存在：${duplicate.name}`);
    const scanned = await buildProjectPayload({ path: resolved });
    project.path = resolved;
    project.techStack = scanned.techStack;
    project.size = scanned.size;
    project.lastUpdated = scanned.lastUpdated;
    project.createdAt = scanned.createdAt;
    project.exists = scanned.exists;
  }
  if (name !== undefined) project.name = String(name).trim() || project.name;
  if (status !== undefined && ['active', 'maintenance', 'archived'].includes(status)) project.status = status;
  if (description !== undefined) project.description = String(description).slice(0, 500);
  if (buildCommand !== undefined) project.buildCommand = String(buildCommand).trim();
  if (workspaceId !== undefined && db.workspaces.some((w) => w.id === workspaceId)) {
    if (workspaceId !== project.workspaceId) {
      const target = db.projects.filter((p) => p.workspaceId === workspaceId && p.id !== project.id);
      project.order = target.length ? Math.max(...target.map((p) => p.order)) + 1 : 0;
      project.workspaceId = workspaceId;
    }
  }
  project.updatedAt = store.nowISO();
  store.persist();
  res.json(project);
}));

app.delete('/api/projects/:id', (req, res) => {
  const db = store.load();
  const before = db.projects.length;
  db.projects = db.projects.filter((p) => p.id !== req.params.id);
  if (db.projects.length === before) throw httpError(404, '项目不存在');
  store.persist();
  res.json({ ok: true });
});

app.post('/api/projects/:id/refresh', asyncHandler(async (req, res) => {
  const db = store.load();
  const project = db.projects.find((p) => p.id === req.params.id);
  if (!project) throw httpError(404, '项目不存在');
  const scanned = await buildProjectPayload({ path: project.path });
  project.techStack = scanned.techStack;
  project.size = scanned.size;
  project.lastUpdated = scanned.lastUpdated;
  project.createdAt = scanned.createdAt;
  project.exists = scanned.exists;
  project.updatedAt = store.nowISO();
  store.persist();
  res.json(project);
}));

app.get('/api/projects/:id/git', asyncHandler(async (req, res) => {
  const project = store.getProjects().find((p) => p.id === req.params.id);
  if (!project) throw httpError(404, '项目不存在');
  const info = await getGitInfo(project.path);
  res.json(info || { available: false });
}));

/* ------------------------------------------------------------------ */
/* 快速操作                                                            */
/* ------------------------------------------------------------------ */

app.post('/api/projects/:id/open', (req, res) => {
  const db = store.load();
  const project = db.projects.find((p) => p.id === req.params.id);
  if (!project) throw httpError(404, '项目不存在');
  if (!fs.existsSync(project.path)) throw httpError(400, `路径不存在：${project.path}`);
  const editorId = req.body?.editorId || db.settings.defaultEditorId;
  const editor = db.editors.find((e) => e.id === editorId) || db.editors[0];
  if (!editor) throw httpError(400, '没有可用的编辑器，请先在设置中添加');
  try {
    const result = openWithEditor(editor, project.path);
    res.json({ ok: true, editor: editor.name, ...result });
  } catch (err) {
    throw httpError(500, `启动 ${editor.name} 失败：${err.message}`);
  }
});

app.post('/api/projects/:id/reveal', (req, res) => {
  const project = store.getProjects().find((p) => p.id === req.params.id);
  if (!project) throw httpError(404, '项目不存在');
  if (!fs.existsSync(project.path)) throw httpError(400, `路径不存在：${project.path}`);
  res.json(revealInExplorer(project.path));
});

app.post('/api/projects/:id/terminal', (req, res) => {
  const project = store.getProjects().find((p) => p.id === req.params.id);
  if (!project) throw httpError(404, '项目不存在');
  if (!fs.existsSync(project.path)) throw httpError(400, `路径不存在：${project.path}`);
  res.json(openInTerminal(project.path));
});

app.post('/api/projects/:id/build', (req, res) => {
  const db = store.load();
  const project = db.projects.find((p) => p.id === req.params.id);
  if (!project) throw httpError(404, '项目不存在');
  if (!fs.existsSync(project.path)) throw httpError(400, `路径不存在：${project.path}`);
  const command = (req.body?.command || project.buildCommand || db.settings.buildCommand || '').trim();
  if (!command) throw httpError(400, '构建命令为空，请在设置或项目中配置');
  const job = startBuild({ projectId: project.id, projectName: project.name, cwd: project.path, command });
  res.status(201).json(serializeJob(job));
});

app.get('/api/builds', (_req, res) => res.json(listJobs()));
app.get('/api/builds/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) throw httpError(404, '构建任务不存在');
  res.json(serializeJob(job));
});
app.post('/api/builds/:id/stop', (req, res) => {
  const result = stopBuild(req.params.id);
  if (!result.ok) throw httpError(400, result.message);
  res.json(result);
});

app.get('/api/builds/:id/stream', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: '构建任务不存在' });
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`event: snapshot\ndata: ${JSON.stringify(serializeJob(job))}\n\n`);

  const unsubscribe = subscribeJob(job.id, (payload) => {
    res.write(`event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`);
  });

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

/* ------------------------------------------------------------------ */
/* 扫描导入                                                            */
/* ------------------------------------------------------------------ */

app.get('/api/fs/browse', asyncHandler(async (req, res) => {
  const target = req.query.path ? String(req.query.path) : os.homedir();
  const result = await browseDirectory(target);
  res.json(result);
}));

app.get('/api/fs/roots', (_req, res) => {
  if (process.platform === 'win32') return res.json(listDrives());
  res.json([
    { name: '主目录', path: os.homedir(), isDir: true },
    { name: '根目录', path: '/', isDir: true },
  ]);
});

app.post('/api/scan', asyncHandler(async (req, res) => {
  const { rootPath, maxDepth = 3 } = req.body || {};
  if (!rootPath) throw httpError(400, '请选择要扫描的目录');
  const resolved = normalizePath(rootPath);
  if (!fs.existsSync(resolved)) throw httpError(400, '目录不存在');
  const started = Date.now();
  const candidates = await scanDirectory(resolved, Number(maxDepth) || 3, 300);
  const enriched = await enrichCandidates(candidates);
  res.json({ rootPath: resolved, elapsed: Date.now() - started, projects: enriched });
}));

app.post('/api/scan/import', asyncHandler(async (req, res) => {
  const db = store.load();
  const { workspaceId, projects = [] } = req.body || {};
  if (!db.workspaces.some((w) => w.id === workspaceId)) throw httpError(400, '请选择有效的工作区');
  const existingPaths = new Set(db.projects.map((p) => path.resolve(p.path)));
  const imported = [];
  const skipped = [];

  for (const item of projects) {
    const resolved = path.resolve(item.path);
    if (existingPaths.has(resolved) || !fs.existsSync(resolved)) {
      skipped.push(item.path);
      continue;
    }
    let scanned = { techStack: item.techStack || [], size: item.size || 0, lastUpdated: item.lastUpdated, createdAt: item.createdAt };
    if (!item.techStack) {
      scanned = await buildProjectPayload({ path: resolved });
    }
    const sameWs = db.projects.filter((p) => p.workspaceId === workspaceId);
    const project = {
      id: store.uid('prj'),
      name: item.name || path.basename(resolved),
      path: resolved,
      workspaceId,
      status: 'active',
      description: '',
      buildCommand: '',
      techStack: scanned.techStack || [],
      size: scanned.size || 0,
      createdAt: scanned.createdAt || store.nowISO(),
      lastUpdated: scanned.lastUpdated || store.nowISO(),
      updatedAt: store.nowISO(),
      exists: true,
      order: sameWs.length ? Math.max(...sameWs.map((p) => p.order), 0) + 1 : 0,
    };
    db.projects.push(project);
    existingPaths.add(resolved);
    imported.push(project);
  }

  store.persist();
  res.json({ imported: imported.length, skipped: skipped.length, projects: imported });
}));

/* ------------------------------------------------------------------ */
/* 编辑器 / 设置 / 数据                                                */
/* ------------------------------------------------------------------ */

app.get('/api/editors', asyncHandler(async (_req, res) => {
  res.json(await getEditors(store.getEditors()));
}));

app.post('/api/editors', (req, res) => {
  const db = store.load();
  const { name, command } = req.body || {};
  if (!name || !command) throw httpError(400, '编辑器名称和命令不能为空');
  const editor = {
    id: store.uid('editor'),
    name: String(name).trim(),
    command: String(command).trim(),
    args: [],
    platform: [process.platform],
    icon: 'Terminal',
    custom: true,
    installed: true,
  };
  db.editors.push(editor);
  clearEditorCache();
  store.persist();
  res.status(201).json(editor);
});

app.delete('/api/editors/:id', (req, res) => {
  const db = store.load();
  const editor = db.editors.find((e) => e.id === req.params.id);
  if (!editor) throw httpError(404, '编辑器不存在');
  if (!editor.custom) throw httpError(400, '内置编辑器不可删除');
  db.editors = db.editors.filter((e) => e.id !== req.params.id);
  if (db.settings.defaultEditorId === editor.id) db.settings.defaultEditorId = 'vscode';
  clearEditorCache();
  store.persist();
  res.json({ ok: true });
});

app.get('/api/settings', (_req, res) => res.json(store.getSettings()));
app.put('/api/settings', (req, res) => {
  const db = store.load();
  db.settings = { ...db.settings, ...(req.body || {}) };
  store.persist();
  res.json(db.settings);
});

app.get('/api/data/export', (_req, res) => {
  const db = store.load();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="dev-workbench-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify({ exportedAt: new Date().toISOString(), ...db }, null, 2));
});

app.post('/api/data/import', (req, res) => {
  const payload = req.body;
  if (!payload || (!Array.isArray(payload.workspaces) && !Array.isArray(payload.projects))) {
    throw httpError(400, '备份文件格式不正确');
  }
  store.replaceAll(payload);
  res.json({ ok: true, workspaces: store.getWorkspaces().length, projects: store.getProjects().length });
});

/* ------------------------------------------------------------------ */
/* 静态资源 & 错误处理                                                 */
/* ------------------------------------------------------------------ */

app.get('/api/health', (_req, res) => res.json({ ok: true, platform: process.platform, node: process.version }));

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[api] 服务端错误:', err);
  res.status(status).json({ error: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`\n  开发者项目管理工作台 - 本地服务已启动`);
  console.log(`  API:    http://127.0.0.1:${PORT}/api`);
  if (fs.existsSync(DIST_DIR)) {
    console.log(`  应用:   http://127.0.0.1:${PORT}`);
    console.log(`  （开发模式请使用 npm run dev，前端由 Vite 提供，端口 5173）`);
  }
  console.log(`  数据文件: ${store.DB_FILE}\n`);
});
