/**
 * 项目扫描模块：从指定根目录递归发现项目（5.3.1 / 3.1）
 */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { detectTechStack, getProjectMeta } from './techStackDetect.js';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt',
  '.output', '.cache', 'target', 'vendor', '__pycache__', '.venv', 'venv',
  '.idea', '.vscode', 'Library', '$RECYCLE.BIN', 'System Volume Information',
]);

/** 判定为项目的标志性文件 */
const PROJECT_MARKERS = [
  'package.json', 'pnpm-workspace.yaml', 'go.mod', 'Cargo.toml', 'pom.xml',
  'build.gradle', 'build.gradle.kts', 'composer.json', 'Gemfile',
  'pyproject.toml', 'requirements.txt', 'setup.py', 'CMakeLists.txt',
  'angular.json', 'nuxt.config.ts', 'nuxt.config.js', 'svelte.config.js',
  'next.config.js', 'next.config.mjs', 'vite.config.ts', 'vite.config.js',
  '.git',
];

export function isProjectDir(entries) {
  return PROJECT_MARKERS.some((m) => entries.includes(m));
}

/**
 * 扫描根目录，返回候选项目（不含体积统计，保证扫描速度）。
 * @param {string} rootPath
 * @param {number} maxDepth
 * @param {number} maxResults
 */
export async function scanDirectory(rootPath, maxDepth = 3, maxResults = 200) {
  const results = [];
  let visited = 0;

  const walk = async (dir, depth) => {
    if (depth > maxDepth || results.length >= maxResults || visited > 4000) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const names = entries.map((e) => e.name);
    visited += 1;

    if (isProjectDir(names)) {
      results.push({
        name: path.basename(dir),
        path: dir,
        markers: PROJECT_MARKERS.filter((m) => names.includes(m)).slice(0, 4),
      });
      return; // 命中项目后不再向下钻取
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      await walk(path.join(dir, entry.name), depth + 1);
    }
  };

  await walk(rootPath, 0);
  return results;
}

/** 为候选项目补全技术栈信息（导入前调用，受并发限制） */
export async function enrichCandidates(candidates, concurrency = 6) {
  const output = new Array(candidates.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, candidates.length) }, async () => {
    while (cursor < candidates.length) {
      const index = cursor++;
      const c = candidates[index];
      try {
        const [techStack, meta] = await Promise.all([detectTechStack(c.path), getProjectMeta(c.path)]);
        output[index] = { ...c, techStack, size: meta.size, lastUpdated: meta.lastUpdated, createdAt: meta.createdAt };
      } catch {
        output[index] = { ...c, techStack: [], size: 0 };
      }
    }
  });
  await Promise.all(workers);
  return output.filter(Boolean);
}

/**
 * 规范化用户输入的路径。
 * 关键点：Windows 下裸盘符（如 "D:"）是「驱动器相对路径」而非「驱动器根」，
 * path.resolve('D:') 会沿用当前工作目录的同盘符部分，导致解析到错误目录。
 * 这里把 "D:" / "D" 这类输入规范为驱动器根 "D:\" 再交给 path.resolve。
 */
export function normalizePath(input) {
  let p = String(input || '').trim();
  if (/^[A-Za-z]:$/.test(p)) p = `${p}\\`;
  else if (/^[A-Za-z]$/.test(p)) p = `${p}:\\`;
  return path.resolve(p);
}

/** 目录浏览（供前端目录选择器使用） */
export async function browseDirectory(targetPath) {
  const resolved = normalizePath(targetPath);
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) throw new Error('目标不是一个目录');

  let entries = [];
  try {
    const raw = await fs.readdir(resolved, { withFileTypes: true });
    entries = raw
      .filter((e) => e.isDirectory() && !IGNORE_DIRS.has(e.name) && !(e.name.startsWith('.') && e.name !== '.git'))
      .map((e) => ({ name: e.name, path: path.join(resolved, e.name), isDir: true }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    throw new Error(`无法读取目录：${err.message}`);
  }

  return {
    path: resolved,
    parent: path.dirname(resolved) === resolved ? null : path.dirname(resolved),
    isProject: false,
    entries,
  };
}

export function listDrives() {
  if (process.platform !== 'win32') return [];
  const out = [];
  for (let code = 67; code <= 90; code += 1) {
    const letter = `${String.fromCharCode(code)}:\\`;
    try {
      if (require('node:fs').existsSync(letter)) out.push({ name: letter, path: letter, isDir: true });
    } catch {
      /* noop */
    }
  }
  return out;
}
