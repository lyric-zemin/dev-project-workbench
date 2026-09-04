/**
 * 技术栈检测模块（5.3.2）
 * 基于项目根目录的清单文件 / 配置文件 / 锁文件 / 源码扩展名进行识别。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { childEnv } from './env.js';
import { META_IGNORE_DIRS } from '../constants.js';

/** 依赖名 -> 技术项 */
const DEP_TECH = {
  react: { name: 'React', category: 'frontend' },
  'react-dom': { name: 'React DOM', category: 'frontend' },
  vue: { name: 'Vue', category: 'frontend' },
  'vue-router': { name: 'Vue Router', category: 'frontend' },
  pinia: { name: 'Pinia', category: 'frontend' },
  vuex: { name: 'Vuex', category: 'frontend' },
  nuxt: { name: 'Nuxt', category: 'frontend' },
  '@angular/core': { name: 'Angular', category: 'frontend' },
  svelte: { name: 'Svelte', category: 'frontend' },
  '@sveltejs/kit': { name: 'SvelteKit', category: 'frontend' },
  next: { name: 'Next.js', category: 'frontend' },
  remix: { name: 'Remix', category: 'frontend' },
  'solid-js': { name: 'SolidJS', category: 'frontend' },
  preact: { name: 'Preact', category: 'frontend' },
  astro: { name: 'Astro', category: 'frontend' },
  'react-router-dom': { name: 'React Router', category: 'frontend' },
  zustand: { name: 'Zustand', category: 'frontend' },
  '@reduxjs/toolkit': { name: 'Redux Toolkit', category: 'frontend' },
  redux: { name: 'Redux', category: 'frontend' },
  mobx: { name: 'MobX', category: 'frontend' },
  '@tanstack/react-query': { name: 'TanStack Query', category: 'frontend' },
  swr: { name: 'SWR', category: 'frontend' },
  axios: { name: 'Axios', category: 'frontend' },
  antd: { name: 'Ant Design', category: 'frontend' },
  '@arco-design/web-react': { name: 'Arco Design', category: 'frontend' },
  '@arco-design/web-vue': { name: 'Arco Design Vue', category: 'frontend' },
  'element-plus': { name: 'Element Plus', category: 'frontend' },
  'element-ui': { name: 'Element UI', category: 'frontend' },
  '@mui/material': { name: 'Material UI', category: 'frontend' },
  'naive-ui': { name: 'Naive UI', category: 'frontend' },
  vant: { name: 'Vant', category: 'frontend' },
  'tdesign-vue-next': { name: 'TDesign', category: 'frontend' },
  echarts: { name: 'ECharts', category: 'frontend' },
  'chart.js': { name: 'Chart.js', category: 'frontend' },
  d3: { name: 'D3', category: 'frontend' },
  three: { name: 'Three.js', category: 'frontend' },
  'framer-motion': { name: 'Framer Motion', category: 'frontend' },
  gsap: { name: 'GSAP', category: 'frontend' },
  'styled-components': { name: 'styled-components', category: 'frontend' },
  '@emotion/react': { name: 'Emotion', category: 'frontend' },
  tailwindcss: { name: 'Tailwind CSS', category: 'frontend' },
  sass: { name: 'Sass', category: 'frontend' },
  less: { name: 'Less', category: 'frontend' },
  bootstrap: { name: 'Bootstrap', category: 'frontend' },
  jquery: { name: 'jQuery', category: 'frontend' },
  lodash: { name: 'Lodash', category: 'tool' },
  dayjs: { name: 'Day.js', category: 'tool' },
  moment: { name: 'Moment.js', category: 'tool' },
  zod: { name: 'Zod', category: 'tool' },
  electron: { name: 'Electron', category: 'tool' },
  '@tauri-apps/api': { name: 'Tauri', category: 'tool' },
  express: { name: 'Express', category: 'backend' },
  koa: { name: 'Koa', category: 'backend' },
  '@nestjs/core': { name: 'NestJS', category: 'backend' },
  fastify: { name: 'Fastify', category: 'backend' },
  egg: { name: 'Egg.js', category: 'backend' },
  '@koa/router': { name: 'Koa Router', category: 'backend' },
  'socket.io': { name: 'Socket.IO', category: 'backend' },
  ws: { name: 'ws', category: 'backend' },
  graphql: { name: 'GraphQL', category: 'backend' },
  '@apollo/server': { name: 'Apollo Server', category: 'backend' },
  mongoose: { name: 'Mongoose', category: 'backend' },
  mongodb: { name: 'MongoDB', category: 'backend' },
  mysql: { name: 'MySQL', category: 'backend' },
  mysql2: { name: 'MySQL2', category: 'backend' },
  pg: { name: 'PostgreSQL', category: 'backend' },
  redis: { name: 'Redis', category: 'backend' },
  prisma: { name: 'Prisma', category: 'backend' },
  '@prisma/client': { name: 'Prisma Client', category: 'backend' },
  sequelize: { name: 'Sequelize', category: 'backend' },
  typeorm: { name: 'TypeORM', category: 'backend' },
  drizzle: { name: 'Drizzle ORM', category: 'backend' },
  typescript: { name: 'TypeScript', category: 'language' },
  vite: { name: 'Vite', category: 'build' },
  '@vitejs/plugin-react': { name: 'Vite', category: 'build' },
  '@vitejs/plugin-vue': { name: 'Vite', category: 'build' },
  webpack: { name: 'Webpack', category: 'build' },
  'webpack-cli': { name: 'Webpack', category: 'build' },
  rollup: { name: 'Rollup', category: 'build' },
  esbuild: { name: 'esbuild', category: 'build' },
  parcel: { name: 'Parcel', category: 'build' },
  gulp: { name: 'Gulp', category: 'build' },
  grunt: { name: 'Grunt', category: 'build' },
  turbo: { name: 'Turborepo', category: 'build' },
  jest: { name: 'Jest', category: 'tool' },
  vitest: { name: 'Vitest', category: 'tool' },
  '@playwright/test': { name: 'Playwright', category: 'tool' },
  cypress: { name: 'Cypress', category: 'tool' },
  mocha: { name: 'Mocha', category: 'tool' },
  eslint: { name: 'ESLint', category: 'tool' },
  prettier: { name: 'Prettier', category: 'tool' },
  husky: { name: 'Husky', category: 'tool' },
  'lint-staged': { name: 'lint-staged', category: 'tool' },
  commitlint: { name: 'commitlint', category: 'tool' },
  'node-sass': { name: 'Sass', category: 'frontend' },
};

/** 清单 / 配置文件 -> 技术项 */
const FILE_TECH = [
  { files: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs', 'vite.config.mts'], tech: { name: 'Vite', category: 'build' } },
  { files: ['webpack.config.js', 'webpack.config.ts', 'webpack.config.cjs'], tech: { name: 'Webpack', category: 'build' } },
  { files: ['rollup.config.js', 'rollup.config.ts', 'rollup.config.mjs'], tech: { name: 'Rollup', category: 'build' } },
  { files: ['angular.json'], tech: { name: 'Angular', category: 'frontend' } },
  { files: ['next.config.js', 'next.config.mjs', 'next.config.ts'], tech: { name: 'Next.js', category: 'frontend' } },
  { files: ['nuxt.config.ts', 'nuxt.config.js'], tech: { name: 'Nuxt', category: 'frontend' } },
  { files: ['svelte.config.js', 'svelte.config.ts'], tech: { name: 'Svelte', category: 'frontend' } },
  { files: ['astro.config.mjs', 'astro.config.ts'], tech: { name: 'Astro', category: 'frontend' } },
  { files: ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.cjs'], tech: { name: 'Tailwind CSS', category: 'frontend' } },
  { files: ['tsconfig.json'], tech: { name: 'TypeScript', category: 'language' } },
  { files: ['jsconfig.json'], tech: { name: 'JavaScript', category: 'language' } },
  { files: ['Dockerfile', 'dockerfile'], tech: { name: 'Docker', category: 'tool' } },
  { files: ['docker-compose.yml', 'docker-compose.yaml', 'compose.yaml', 'compose.yml'], tech: { name: 'Docker Compose', category: 'tool' } },
  { files: ['go.mod'], tech: { name: 'Go', category: 'language' } },
  { files: ['Cargo.toml'], tech: { name: 'Rust', category: 'language' } },
  { files: ['pom.xml'], tech: { name: 'Maven', category: 'build' } },
  { files: ['build.gradle', 'build.gradle.kts', 'settings.gradle'], tech: { name: 'Gradle', category: 'build' } },
  { files: ['composer.json'], tech: { name: 'Composer', category: 'build' } },
  { files: ['Gemfile'], tech: { name: 'Bundler', category: 'build' } },
  { files: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'], tech: { name: 'Python', category: 'language' } },
  { files: ['Makefile'], tech: { name: 'Make', category: 'build' } },
  { files: ['CMakeLists.txt'], tech: { name: 'CMake', category: 'build' } },
  { files: ['jest.config.js', 'jest.config.ts', 'jest.config.mjs'], tech: { name: 'Jest', category: 'tool' } },
  { files: ['vitest.config.ts', 'vitest.config.js'], tech: { name: 'Vitest', category: 'tool' } },
  { files: ['.eslintrc', '.eslintrc.js', '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs'], tech: { name: 'ESLint', category: 'tool' } },
  { files: ['.prettierrc', '.prettierrc.json', 'prettier.config.js'], tech: { name: 'Prettier', category: 'tool' } },
  { files: ['lerna.json'], tech: { name: 'Lerna', category: 'tool' } },
  { files: ['pnpm-workspace.yaml', 'turbo.json'], tech: { name: 'Monorepo', category: 'tool' } },
  { files: ['.github'], tech: { name: 'GitHub Actions', category: 'tool' } },
  { files: ['.gitlab-ci.yml'], tech: { name: 'GitLab CI', category: 'tool' } },
];

/** 锁文件 -> 包管理器 */
const LOCK_FILES = [
  { file: 'pnpm-lock.yaml', name: 'pnpm' },
  { file: 'yarn.lock', name: 'Yarn' },
  { file: 'bun.lockb', name: 'Bun' },
  { file: 'bun.lock', name: 'Bun' },
  { file: 'package-lock.json', name: 'npm' },
  { file: 'npm-shrinkwrap.json', name: 'npm' },
];

const MAX_FILES = 12000;
const MAX_DEPTH = 6;

async function readJsonSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function cleanVersion(range) {
  if (typeof range !== 'string') return undefined;
  let v = range.split('||')[0].trim();
  if (!v || v === '*' || v === 'latest' || v.startsWith('workspace:') || v.startsWith('file:') || v.startsWith('link:')) {
    return undefined;
  }
  v = v.replace(/^[\^~>=<v\s]+/, '').trim();
  if (!/^\d/.test(v)) return undefined;
  return v || undefined;
}

/**
 * 递归统计项目体积与最近修改时间（跳过依赖/构建产物目录，带上限保护）。
 * @returns {Promise<{size:number, lastUpdated:string, createdAt:string, hasGit:boolean, fileCount:number}>}
 */
export async function getProjectMeta(projectPath) {
  let size = 0;
  let fileCount = 0;
  let newest = 0;
  let truncated = false;

  const walk = async (dir, depth) => {
    if (depth > MAX_DEPTH || fileCount > MAX_FILES) {
      truncated = true;
      return;
    }
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // 无权限目录优雅降级
    }
    for (const entry of entries) {
      if (fileCount > MAX_FILES) {
        truncated = true;
        return;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (META_IGNORE_DIRS.has(entry.name)) continue;
        await walk(full, depth + 1);
      } else if (entry.isFile()) {
        try {
          const st = await fs.stat(full);
          size += st.size;
          fileCount += 1;
          if (st.mtimeMs > newest) newest = st.mtimeMs;
        } catch {
          /* 忽略无法访问的文件 */
        }
      }
    }
  };

  await walk(projectPath, 0);

  let createdAt = new Date().toISOString();
  try {
    const st = await fs.stat(projectPath);
    createdAt = (st.birthtimeMs ? new Date(st.birthtimeMs) : new Date(st.ctimeMs)).toISOString();
    if (st.mtimeMs > newest) newest = st.mtimeMs;
  } catch {
    /* noop */
  }

  return {
    size,
    fileCount,
    truncated,
    lastUpdated: newest ? new Date(newest).toISOString() : new Date().toISOString(),
    createdAt,
    hasGit: await exists(path.join(projectPath, '.git')),
  };
}

/**
 * 检测项目技术栈。
 * @param {string} projectPath
 * @returns {Promise<Array<{name:string, version?:string, category:string}>>}
 */
export async function detectTechStack(projectPath) {
  const found = new Map();
  const add = (name, category, version) => {
    if (!name) return;
    const key = name.toLowerCase();
    const prev = found.get(key);
    if (prev) {
      if (!prev.version && version) prev.version = version;
      return;
    }
    found.set(key, { name, category, version });
  };

  // 1. package.json 依赖
  const pkg = await readJsonSafe(path.join(projectPath, 'package.json'));
  if (pkg) {
    const deps = { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.dependencies };
    // 短名优先（如 vite 优先于 @vitejs/plugin-react），保证版本号来自主包
    const ordered = Object.entries(deps).sort(([a], [b]) => a.length - b.length || a.localeCompare(b));
    for (const [dep, range] of ordered) {
      const t = DEP_TECH[dep];
      if (t) add(t.name, t.category, cleanVersion(range));
    }
    if (pkg.engines?.node) add('Node.js', 'other', cleanVersion(pkg.engines.node));
    if (pkg.packageManager) {
      const [pm, ver] = String(pkg.packageManager).split('@');
      if (pm) add(pm === 'npm' ? 'npm' : pm.charAt(0).toUpperCase() + pm.slice(1), 'tool', ver);
    }
    if (pkg.type === 'module') add('ESM', 'other');
  }

  // 2. 锁文件 -> 包管理器
  for (const { file, name } of LOCK_FILES) {
    if (await exists(path.join(projectPath, file))) add(name, 'tool');
  }

  // 3. 配置 / 清单文件
  for (const { files, tech } of FILE_TECH) {
    for (const f of files) {
      if (await exists(path.join(projectPath, f))) {
        add(tech.name, tech.category);
        break;
      }
    }
  }

  // 4. 源码扩展名（浅层探测，最多 2 层）
  const extHits = new Map();
  const probe = async (dir, depth) => {
    if (depth > 2) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (META_IGNORE_DIRS.has(entry.name)) continue;
        await probe(path.join(dir, entry.name), depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        extHits.set(ext, (extHits.get(ext) || 0) + 1);
      }
    }
  };
  await probe(projectPath, 0);

  const hasExt = (ext) => (extHits.get(ext) || 0) > 0;
  if (hasExt('.vue')) add('Vue', 'frontend');
  if (hasExt('.svelte')) add('Svelte', 'frontend');
  if (hasExt('.tsx') || hasExt('.jsx')) add('JSX', 'language');
  if (hasExt('.ts') || hasExt('.tsx')) add('TypeScript', 'language');
  if (hasExt('.js') || hasExt('.jsx') || hasExt('.mjs') || hasExt('.cjs')) add('JavaScript', 'language');
  if (hasExt('.py')) add('Python', 'language');
  if (hasExt('.go')) add('Go', 'language');
  if (hasExt('.rs')) add('Rust', 'language');
  if (hasExt('.java')) add('Java', 'language');
  if (hasExt('.kt')) add('Kotlin', 'language');
  if (hasExt('.rb')) add('Ruby', 'language');
  if (hasExt('.php')) add('PHP', 'language');
  if (hasExt('.swift')) add('Swift', 'language');
  if (hasExt('.md')) add('Markdown', 'other');

  // 5. Git 仓库
  if (await exists(path.join(projectPath, '.git'))) add('Git', 'tool');

  // 分类排序：语言 -> 框架 -> 构建 -> 工具 -> 其他
  const order = { language: 0, frontend: 1, backend: 2, build: 3, tool: 4, other: 5 };
  return [...found.values()].sort((a, b) => {
    const d = (order[a.category] ?? 9) - (order[b.category] ?? 9);
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });
}

/** 读取最近一次 Git 提交信息（需要本机 Git 环境，失败时返回 null） */
export function getGitInfo(projectPath) {
  return new Promise((resolve) => {
    const format = '%H%n%an%n%ad%n%s';
    execFile(
      'git',
      ['-C', projectPath, 'log', '-1', `--pretty=format:${format}`, '--date=iso'],
      { timeout: 6000, windowsHide: true, env: childEnv() },
      (err, stdout) => {
        if (err || !stdout || !stdout.trim()) return resolve(null);
        const [hash, author, date, subject] = stdout.split('\n');
        execFile(
          'git',
          ['-C', projectPath, 'rev-parse', '--abbrev-ref', 'HEAD'],
          { timeout: 4000, windowsHide: true, env: childEnv() },
          (err2, branchOut) =>
            resolve({
              hash: (hash || '').slice(0, 8),
              author: author || '',
              date: date || '',
              message: subject || '',
              branch: err2 ? '' : (branchOut || '').trim(),
            })
        );
      }
    );
  });
}
