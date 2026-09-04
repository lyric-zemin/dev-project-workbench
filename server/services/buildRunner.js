/**
 * 构建任务执行器（3.3.2）：child_process 执行命令 + 实时日志 + SSE 推送
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { uid } from '../store.js';
import { childEnv } from './env.js';

const MAX_LOG_LINES = 3000;
const MAX_KEEP_JOBS = 20;

/** @type {Map<string, any>} */
const jobs = new Map();
/** @type {Map<string, Set<(payload:any)=>void>>} */
const subscribers = new Map();

function emit(jobId, payload) {
  const set = subscribers.get(jobId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(payload);
    } catch {
      /* 忽略单个订阅者异常 */
    }
  }
}

function pushLog(job, chunk) {
  const text = String(chunk);
  const lines = text.split(/\r?\n/);
  // 将首行拼接到上一条未结束的日志上，保持终端换行一致性
  if (job.pending) {
    job.logs[job.logs.length - 1] = (job.logs[job.logs.length - 1] || '') + lines.shift();
    job.pending = false;
  }
  for (let i = 0; i < lines.length; i += 1) {
    const isLast = i === lines.length - 1;
    if (isLast && text && !text.endsWith('\n')) {
      job.logs.push(lines[i]);
      job.pending = true;
    } else if (lines[i] !== '' || i !== lines.length - 1) {
      job.logs.push(lines[i]);
    }
  }
  if (job.logs.length > MAX_LOG_LINES) {
    job.logs.splice(0, job.logs.length - MAX_LOG_LINES);
    job.logs.unshift('...（日志过多，已截断部分早期输出）');
  }
  emit(job.id, { type: 'log', text });
}

/** 解析命令字符串，支持引号包裹的参数 */
export function parseCommand(command) {
  const tokens = [];
  let current = '';
  let quote = null;
  for (const ch of String(command || '')) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (current) tokens.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function buildEnv(cwd) {
  const env = childEnv({ FORCE_COLOR: '0', NO_COLOR: '1', CI: '' });
  const binDir = path.join(cwd, 'node_modules', '.bin');
  const sep = process.platform === 'win32' ? ';' : ':';
  env.PATH = `${binDir}${sep}${env.PATH || env.Path || ''}`;
  if (process.platform === 'win32') env.Path = env.PATH;
  return env;
}

/**
 * 启动一次构建任务
 * @param {{projectId:string, projectName:string, cwd:string, command:string}} options
 */
export function startBuild({ projectId, projectName, cwd, command }) {
  const tokens = parseCommand(command);
  if (!tokens.length) throw new Error('构建命令为空');

  const job = {
    id: uid('build'),
    projectId,
    projectName,
    cwd,
    command,
    status: 'running',
    exitCode: null,
    logs: [],
    pending: false,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };

  jobs.set(job.id, job);

  // 仅保留最近的任务，避免内存膨胀
  if (jobs.size > MAX_KEEP_JOBS) {
    const oldest = [...jobs.keys()].slice(0, jobs.size - MAX_KEEP_JOBS);
    oldest.forEach((id) => jobs.delete(id));
  }

  const isWin = process.platform === 'win32';
  const bin = tokens[0];
  const args = tokens.slice(1);

  let child;
  try {
    child = spawn(bin, args, {
      cwd,
      env: buildEnv(cwd),
      shell: isWin, // Windows 下需要 shell 解析 .cmd（npm.cmd / yarn.cmd / pnpm.cmd）
      windowsHide: true,
    });
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    job.finishedAt = new Date().toISOString();
    emit(job.id, { type: 'error', message: err.message });
    return job;
  }

  job.pid = child.pid;
  job.child = child;

  child.stdout?.on('data', (chunk) => pushLog(job, chunk));
  child.stderr?.on('data', (chunk) => pushLog(job, chunk));

  child.on('error', (err) => {
    job.status = 'failed';
    job.error = err.message;
    job.finishedAt = new Date().toISOString();
    pushLog(job, `\n[错误] ${err.message}\n`);
    emit(job.id, { type: 'done', status: job.status, exitCode: null, error: job.error });
  });

  child.on('close', (code, signal) => {
    if (job.status !== 'running') return;
    job.exitCode = code;
    job.status = code === 0 ? 'success' : 'failed';
    job.finishedAt = new Date().toISOString();
    const tail = `\n[结束] 退出码 ${code}${signal ? `（信号 ${signal}）` : ''}\n`;
    pushLog(job, tail);
    emit(job.id, { type: 'done', status: job.status, exitCode: code, error: null });
  });

  pushLog(job, `$ ${command}\n工作目录: ${cwd}\n${'-'.repeat(48)}\n`);
  return job;
}

export function stopBuild(jobId) {
  const job = jobs.get(jobId);
  if (!job || job.status !== 'running') return { ok: false, message: '任务已结束' };
  const child = job.child;
  if (!child) return { ok: false, message: '无法获取进程' };
  try {
    if (process.platform === 'win32' && child.pid) {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
    } else {
      child.kill('SIGTERM');
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {
          /* noop */
        }
      }, 3000);
    }
    job.status = 'cancelled';
    job.finishedAt = new Date().toISOString();
    pushLog(job, '\n[已取消] 用户终止了构建任务\n');
    emit(job.id, { type: 'done', status: 'cancelled', exitCode: null, error: null });
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

export function serializeJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    projectId: job.projectId,
    projectName: job.projectName,
    command: job.command,
    cwd: job.cwd,
    status: job.status,
    exitCode: job.exitCode,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    error: job.error,
    logs: job.logs.slice(),
  };
}

export function listJobs() {
  return [...jobs.values()].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)).map(serializeJob);
}

/** SSE 订阅；返回取消订阅函数 */
export function subscribeJob(jobId, handler) {
  if (!subscribers.has(jobId)) subscribers.set(jobId, new Set());
  subscribers.get(jobId).add(handler);
  return () => {
    const set = subscribers.get(jobId);
    if (set) {
      set.delete(handler);
      if (!set.size) subscribers.delete(jobId);
    }
  };
}
