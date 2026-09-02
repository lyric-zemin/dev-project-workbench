/**
 * 编辑器命令模块（5.3.3）
 * 使用 child_process 打开编辑器 / 文件管理器，支持 Windows / macOS / Linux。
 */
import { spawn } from 'node:child_process';

const PLATFORMS = ['win32', 'darwin', 'linux'];

/**
 * 内置编辑器配置。command 为可执行命令（需在 PATH 中或使用绝对路径）。
 */
export const DEFAULT_EDITORS = [
  {
    id: 'vscode',
    name: 'VS Code',
    command: 'code',
    args: [],
    platform: PLATFORMS,
    icon: 'Code2',
    custom: false,
  },
  {
    id: 'vscode-insiders',
    name: 'VS Code Insiders',
    command: 'code-insiders',
    args: [],
    platform: PLATFORMS,
    icon: 'Code2',
    custom: false,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    command: 'cursor',
    args: [],
    platform: PLATFORMS,
    icon: 'Sparkles',
    custom: false,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    command: 'windsurf',
    args: [],
    platform: PLATFORMS,
    icon: 'Wind',
    custom: false,
  },
  {
    id: 'trae',
    name: 'Trae',
    command: 'trae',
    args: [],
    platform: PLATFORMS,
    icon: 'Bot',
    custom: false,
  },
  {
    id: 'webstorm',
    name: 'WebStorm',
    command: 'webstorm',
    args: [],
    platform: PLATFORMS,
    icon: 'Atom',
    custom: false,
  },
  {
    id: 'idea',
    name: 'IntelliJ IDEA',
    command: 'idea',
    args: [],
    platform: PLATFORMS,
    icon: 'Brain',
    custom: false,
  },
  {
    id: 'pycharm',
    name: 'PyCharm',
    command: 'pycharm',
    args: [],
    platform: PLATFORMS,
    icon: 'Braces',
    custom: false,
  },
  {
    id: 'goland',
    name: 'GoLand',
    command: 'goland',
    args: [],
    platform: PLATFORMS,
    icon: 'Boxes',
    custom: false,
  },
  {
    id: 'sublime',
    name: 'Sublime Text',
    command: process.platform === 'darwin'
      ? '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl'
      : 'subl',
    args: [],
    platform: PLATFORMS,
    icon: 'FileCode2',
    custom: false,
  },
  {
    id: 'zed',
    name: 'Zed',
    command: 'zed',
    args: [],
    platform: PLATFORMS,
    icon: 'Zap',
    custom: false,
  },
  {
    id: 'notepadpp',
    name: 'Notepad++',
    command: 'notepad++',
    args: [],
    platform: ['win32'],
    icon: 'FileText',
    custom: false,
  },
  {
    id: 'vim',
    name: 'Vim (终端)',
    command: 'vim',
    args: [],
    platform: PLATFORMS,
    icon: 'TerminalSquare',
    custom: false,
  },
];

const checkCache = new Map();

/** 判断命令是否可用（Windows: where，其他: which / command -v） */
function commandExists(command) {
  if (!command) return false;
  if (command.includes('/') || command.includes('\\')) {
    return true; // 绝对路径不校验，交给用户负责
  }
  if (checkCache.has(command)) return checkCache.get(command);
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const probe = spawn(isWin ? 'where' : 'sh', isWin ? [command] : ['-c', `command -v ${command}`], {
      stdio: 'ignore',
      shell: isWin,
    });
    let done = false;
    const finish = (val) => {
      if (done) return;
      done = true;
      checkCache.set(command, val);
      resolve(val);
    };
    probe.on('error', () => finish(false));
    probe.on('close', (code) => finish(code === 0));
    setTimeout(() => {
      if (!done) {
        try {
          probe.kill();
        } catch {
          /* noop */
        }
        finish(false);
      }
    }, 4000);
  });
}

export async function getEditors(editors) {
  const usable = editors.filter((e) => !e.platform || e.platform.includes(process.platform));
  return Promise.all(
    usable.map(async (e) => ({ ...e, installed: await commandExists(e.command) }))
  );
}

export function clearEditorCache() {
  checkCache.clear();
}

/**
 * 使用指定编辑器打开项目目录。
 * @param {object} editor 编辑器配置
 * @param {string} projectPath 项目绝对路径
 */
export function openWithEditor(editor, projectPath) {
  if (!editor) throw new Error('未指定编辑器');
  const args = [...(editor.args || []), projectPath];
  const isWin = process.platform === 'win32';
  const child = spawn(editor.command, args, {
    cwd: projectPath,
    detached: true,
    stdio: 'ignore',
    shell: isWin,
    windowsHide: true,
  });
  child.on('error', (err) => {
    console.error(`[editor] 启动 ${editor.name} 失败:`, err.message);
  });
  child.unref();
  return { ok: true, command: `${editor.command} ${args.join(' ')}` };
}

/** 在系统文件管理器中打开（Windows 资源管理器 / macOS Finder / Linux 文件管理器） */
export function revealInExplorer(targetPath) {
  const platform = process.platform;
  let command;
  let args;
  if (platform === 'win32') {
    command = 'explorer';
    args = [targetPath];
  } else if (platform === 'darwin') {
    command = 'open';
    args = [targetPath];
  } else {
    command = 'xdg-open';
    args = [targetPath];
  }
  const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: false });
  child.on('error', (err) => console.error('[explorer] 打开失败:', err.message));
  child.unref();
  return { ok: true, command: `${command} ${args.join(' ')}` };
}

/** 在系统终端中打开项目目录 */
export function openInTerminal(targetPath) {
  const platform = process.platform;
  if (platform === 'win32') {
    const child = spawn('cmd', ['/c', 'start', 'cmd', '/k', 'cd /d', targetPath], {
      detached: true,
      stdio: 'ignore',
      shell: true,
      windowsHide: true,
    });
    child.on('error', (err) => console.error('[terminal] 打开失败:', err.message));
    child.unref();
    return { ok: true };
  }
  const command = platform === 'darwin' ? 'open' : 'x-terminal-emulator';
  const args = platform === 'darwin' ? ['-a', 'Terminal', targetPath] : ['--working-directory', targetPath];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {
    // 回退到 xdg-open
    const fallback = spawn('xdg-open', [targetPath], { detached: true, stdio: 'ignore' });
    fallback.unref();
  });
  child.unref();
  return { ok: true };
}
