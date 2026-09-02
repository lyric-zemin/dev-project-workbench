/**
 * Electron 主进程：在桌面应用中内嵌本地 Express 后端，并加载前端。
 *
 * 工作原理：
 *  - Electron 主进程本身就是 Node 运行时，直接加载 server/index.js 启动后端，
 *    无需额外打包 Node 或 spawn 子进程。
 *  - 数据目录通过 DWB_DATA_DIR 注入 app.getPath('userData')，避免写入只读的
 *    asar 资源目录（开发模式沿用 server/data）。
 *  - 主窗口加载 http://127.0.0.1:5177（Express 托管的前端 dist）。
 */
import { app, BrowserWindow, shell, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isPackaged = app.isPackaged;
const API_PORT = Number(process.env.PORT || 5177);

// 文件位置：
//   开发模式：electron/main.js 位于 <root>/electron，projectRoot = <root>
//   打包模式：electron/main.js 位于 resources/app/electron，projectRoot = resources/app
const projectRoot = path.join(__dirname, '..');

let mainWindow = null;

function startBackend() {
  // 数据目录：打包后写入用户数据目录，开发模式沿用 server/data
  const dataDir = isPackaged
    ? path.join(app.getPath('userData'), 'data')
    : path.join(projectRoot, 'server', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // 前端静态目录：
  //   - 开发模式：<root>/dist
  //   - 打包模式：dist 经 asarUnpack 解包到 resources/app.asar.unpacked/dist（真实文件系统，
  //     避免 Express 从 asar 虚拟协议读取静态资源的边缘问题）
  const distDir = isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'dist')
    : path.join(projectRoot, 'dist');

  process.env.DWB_DATA_DIR = dataDir;
  process.env.DWB_DIST_DIR = distDir;
  process.env.PORT = String(API_PORT);
  process.env.NODE_ENV = 'production';

  // Electron 主进程自带 Node，直接加载后端入口即可。
  // 注意：Windows 下 ESM 的 import() 必须传 file:// URL，不能用裸绝对路径。
  const serverEntry = pathToFileURL(path.join(projectRoot, 'server', 'index.js')).href;
  import(serverEntry)
    .then(() => console.log('[electron] 后端已启动'))
    .catch((err) => console.error('[electron] 后端启动失败:', err));
}

function createWindow() {
  // 应用图标：开发/打包下均位于 <root>/assets（随 files 打包进 asar）
  const iconPath = path.join(projectRoot, 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0f172a',
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${API_PORT}`);

  // 外部链接用系统浏览器打开，避免应用内跳转
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 移除 Electron 默认菜单栏（File/Edit/View 等），使用应用自身 UI
  Menu.setApplicationMenu(null);
  startBackend();
  // 等后端就绪再加载页面，避免首屏 502
  setTimeout(createWindow, isPackaged ? 800 : 400);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
