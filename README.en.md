<div align="center">

# Dev Project Workbench

**Manage every local project in one place · Auto-detect tech stacks · Open in your editor with one click · Build with one click**

[简体中文](./README.md) · [English](./README.en.md)

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Win%20%2F%20macOS%20%2F%20Linux-lightgrey)
![License](https://img.shields.io/badge/License-MIT-yellow?logo=opensourceinitiative&logoColor=white)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)

</div>

![Workbench dashboard](./screenshot.png)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation & Usage](#installation--usage)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [FAQ](#faq)
- [License](#license)

---

## Overview

**Dev Project Workbench** is a local project management tool built for developers. It gathers the projects scattered across your disk into a single dashboard, automatically detects each project's tech stack, lets you open any project in your editor, and runs build commands at the press of a button.

If you constantly jump between projects, forget whether a repo is Vue or React, or waste time `cd`-ing around before every build — this tool is built for you.

### Design Constraint & Architecture

"Open in editor" and "run build" depend on Node.js `child_process`, which a browser simply cannot do. That's why this project uses a **Vite frontend + local Express backend** monolith rather than a purely static app.

| Layer | Stack | Notes |
| :--- | :--- | :--- |
| Frontend | React 18 + TypeScript + Vite 6 + Tailwind CSS v4 | Component-based, type-safe, utility-first styling |
| State | Zustand | `projectStore` / `workspaceStore` / `settingsStore` |
| Routing | React Router 6 | `/` dashboard, `/settings` settings |
| Backend | Express 4 (local service, port `5177`) | Directory scanning, tech-stack detection, editor launching, build execution |
| Storage | Local JSON file | Data never leaves your machine; export / import supported |

Two run modes:

| Mode | Command | URL | Notes |
| :--- | :--- | :--- | :--- |
| Development | `npm run dev` | `http://localhost:5173` | Vite HMR, `/api` proxied to the backend |
| Production | `npm run serve` | `http://127.0.0.1:5177` | Express serves API and `dist` on a single port |

---

## Features

### Project Management

- **Multiple workspaces** — ships with "Personal / Work / Open Source"; create, edit, delete, and **drag-to-reorder** them, with custom icons and accent colors
- **Aggregate view** — "All Projects" merges every workspace, each showing a live project count
- **Full CRUD** — create, edit, and remove projects with status tags (Active / Maintenance / Archived)
- **Dual views** — switch between grid cards and a compact list
- **Flexible sorting** — custom (drag & drop), name, pinyin, last updated, created at, size; each with ascending / descending order
- **Bulk import** — scan a directory and import projects in batch, automatically skipping `node_modules`, `.git`, `dist`, and similar directories

### Tech Stack Visualization

- **Automatic detection** across six categories: languages (TypeScript / JavaScript / Python / Go / Rust / Java…), frontend frameworks (React / Vue / Angular / Svelte / Next / Nuxt…), backend (Express / NestJS / Prisma…), build tools (Vite / Webpack / Rollup / Maven…), package managers (npm / yarn / pnpm / bun), and tooling (Git / Docker / ESLint / Jest…)
- **Version extraction** — reads real versions from `package.json`; shorter package names win (e.g. `vite` takes priority over `@vitejs/plugin-react`)
- **Tags are filters** — click any tech tag to filter projects by that technology

### Project Details

- Slide-over detail panel: path, workspace, size, created at, last updated, description, build command
- Tech stack grouped by category
- Most recent Git commit (requires Git installed locally)

### Quick Actions

- **Open in editor** — 13 built-in editors including VS Code / Cursor / Trae / WebStorm / IntelliJ IDEA / Sublime Text / Zed / Notepad++ / Vim, with automatic installation detection and support for custom editors
- **One-click build** — real-time log stream over SSE, elapsed-time counter, cancel mid-run, completion notification
- **More actions** — reveal in file manager, open in terminal, copy project path, refresh tech stack
- **Context menu** — right-click any card or row for the full action menu

### Search & Interaction

- **Search** — project name / path / tech stack / description, with fuzzy matching
- **Filtering** — status + tech stack + workspace, freely combined (multiple tech stacks use AND semantics)
- **Shortcuts** — `Ctrl/⌘ + F` search, `Ctrl/⌘ + N` new project, `Ctrl/⌘ + S` settings
- **Theming** — light / dark / follow system; responsive across desktop, tablet, and mobile

---

## Requirements

| Item | Requirement |
| :--- | :--- |
| Node.js | **>= 18** (20 LTS recommended) |
| npm | >= 9 (bundled with Node) |
| Git | Optional — required only for the "latest commit" display |
| OS | Windows 10+ / macOS 10.14+ / Ubuntu 18.04+ |

> Windows offers the most complete experience (e.g. the directory picker enumerates drive letters). Core features are identical across platforms.

---

## Installation & Usage

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/dev-project-workbench.git
cd dev-project-workbench

# 2. Install dependencies
npm install

# 3. Start in development mode (frontend HMR + backend --watch)
npm run dev
```

Open `http://localhost:5173`. On first launch the backend seeds default data (3 default workspaces, 0 projects).

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Development mode. Runs the backend (5177, `--watch`) and Vite (5173) concurrently |
| `npm run build` | Builds the frontend into `dist/` only |
| `npm run start` | Starts the backend only, serving the existing `dist` |
| `npm run serve` | Production mode. Builds, then starts with `NODE_ENV=production` on `http://127.0.0.1:5177` |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |

> `npm run start` checks for the `dist` directory only once at startup — after building, restart the service for changes to take effect. Use `npm run serve` for production deployments.

### Packaging as a Desktop App (Electron)

The app relies on Node's `child_process`, so it can't ship as a browser-only build. Electron bundles the frontend `dist` together with the local Express backend into a desktop app that **runs without Node installed**.

**How it works**: the Electron main process is itself a Node runtime, so it directly loads `server/index.js` to start the backend on `127.0.0.1:5177`, and the main window loads that URL. The data directory is injected via `DWB_DATA_DIR` into `app.getPath('userData')/data` to avoid writing into the read-only asar bundle.

```bash
# Debug with Electron (builds the frontend first, then opens the desktop window)
npm run electron:dev

# Package Windows executables
npm run dist:win             # Produces both the NSIS installer and the portable build
npm run dist:win:nsis        # NSIS installer only (recommended for distribution)
npm run dist:win:portable    # Single-file portable build only (no installation)
```

Artifacts land in `release/`:

| File | Description |
| :--- | :--- |
| `DevProjectWorkbench-<version>-Setup.exe` | NSIS installer with a customizable install path and desktop shortcut |
| `DevProjectWorkbench-<version>-portable.exe` | Portable build — no installation, just double-click to run |

> - The first `npm install` downloads the Electron binary. If your network is restricted, set a mirror: `$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"`
> - Bundle size is roughly 80–150 MB, which is normal for Electron
> - To use a custom app icon, place `icon.ico` in `assets/` and point `win.icon` in `electron-builder.yml` at it

---

## Configuration

### Application Settings

Available on the settings page (`/settings`), persisted in `server/data/store.json`:

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `theme` | `light` \| `dark` \| `system` | `system` | Theme mode; also written to the localStorage key `dwb.theme` to avoid a flash on first paint |
| `defaultEditorId` | `string` | `vscode` | Default editor ID used by the "Open" action |
| `buildCommand` | `string` | `npm run build` | Default build command; can be overridden per project |
| `viewMode` | `grid` \| `list` | `grid` | Default view mode |
| `sortBy` | `custom` \| `name` \| `pinyin` \| `lastUpdated` \| `createdAt` \| `size` | `custom` | Sort field. `custom` enables drag-to-reorder |
| `sortDir` | `asc` \| `desc` | `asc` | Sort direction |
| `scanMaxDepth` | `number` | `3` | Maximum directory scan depth — higher values are slower |
| `confirmBeforeBuild` | `boolean` | `true` | Whether to confirm before running a build |

### Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5177` | Backend listening port (the Electron main process reads it too) |
| `NODE_ENV` | — | When set to `production`, Express serves the `dist` static assets |
| `DWB_DATA_DIR` | `server/data` | Data directory. In packaged Electron builds this points to `userData/data` |
| `ELECTRON_MIRROR` | — | Electron binary download mirror; needed only during install / packaging |

### Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl / ⌘ + F` | Focus the search box |
| `Ctrl / ⌘ + N` | Create a new project |
| `Ctrl / ⌘ + S` | Open settings |
| `Esc` | Close a modal / drawer |

### Data Storage

- Location: `server/data/store.json` (already in `.gitignore`)
- **Deleting this file restores the initial state** (3 default workspaces, 0 projects)
- Writes are debounced by 120 ms and use an atomic "write `.tmp`, then `rename`" strategy
- The settings page supports **JSON export / import** for backup and migration

---

## Project Structure

```
.
├── server/                     # Local Express backend (native ESM, no build step)
│   ├── index.js                # All /api routes plus static asset serving
│   ├── store.js                # Local JSON persistence (debounced writes + atomic replace)
│   ├── constants.js            # Constants shared inside the backend
│   └── services/
│       ├── projectScanner.js   # Recursive directory scanning and project detection
│       ├── techStackDetect.js  # Tech-stack detection / size stats / Git info
│       ├── editorCommands.js   # Editor and file-manager launching (cross-platform)
│       └── buildRunner.js      # Build task execution and log streaming (SSE)
├── shared/
│   └── ports.js                # Constants shared across runtimes (backend / Electron / Vite)
├── src/
│   ├── components/             # UI components (Modal / ProjectCard / WorkspaceNav …)
│   ├── pages/                  # Dashboard / Settings
│   ├── stores/                 # Zustand stores: project / workspace / settings / toast
│   ├── hooks/                  # Hotkeys, project actions
│   ├── constants/              # Frontend constants: theme / sort / status / colors / UI values …
│   ├── lib/                    # API client, formatting, filtering & sorting, icons
│   └── types/                  # TypeScript type definitions
├── electron/
│   └── main.js                 # Electron main process, boots the backend in-process
├── assets/                     # Application icons
├── doc/
│   └── PRD-1.0.0.md            # Product requirements document
└── electron-builder.yml        # Desktop packaging configuration
```

---

## Contributing

Issues and pull requests are welcome. Please read the conventions below before you start.

### Development Workflow

```bash
git checkout -b feat/your-feature
# ... develop and commit ...
npm run typecheck    # must report zero errors
npm run build        # must succeed
```

> There is no test framework or linter configured. Before submitting, please **at least** pass `npm run typecheck` and `npm run build`. For backend changes, verify `api/health`, `api/bootstrap`, and any affected routes with `curl.exe`.

### Code Conventions

| Topic | Convention |
| :--- | :--- |
| Path alias | `@/*` is configured **twice** — in `tsconfig.json` `paths` and `vite.config.ts` `resolve.alias`. Change both together |
| Backend errors | In synchronous routes, `throw` an error carrying `status`; **async routes must be wrapped in `asyncHandler`**, otherwise rejections become unhandled promises |
| Component changes | `ProjectCard` and `ProjectListItem` share `ProjectViewProps` from `components/projectShared.ts` — update both when adding a displayed field |
| Project actions | Centralized in `hooks/useProjectActions.tsx` (note: **`.tsx`**, it contains JSX); the context menu and the detail panel share the same menu definition |
| Style maps | `lib/format.ts` holds `STATUS_META` / `CATEGORY_META` / `WORKSPACE_COLORS` — change status and tech-stack colors there |
| Tailwind v4 | Dark mode depends on the `.dark` class on `<html>` — **do not** use the v3 `darkMode: 'media'` config |
| New writes | Store getters return internal object references, so direct mutation works — but remember to call `persist()` |
| Editor cache | Always call `clearEditorCache()` after adding or removing a custom editor |

---

## FAQ

<details>
<summary><strong>Where is my data stored? Is anything uploaded?</strong></summary>

Everything lives in `server/data/store.json` on your machine — **nothing is uploaded to any server**. Import / export also operates entirely locally.
</details>

<details>
<summary><strong>How do I reset to the initial state?</strong></summary>

Delete `server/data/store.json` and restart the service to restore the initial state (3 default workspaces, 0 projects). Consider exporting a backup from the settings page first.
</details>

<details>
<summary><strong>Does "Remove project" delete files on disk?</strong></summary>

No. Removal only deletes the record inside the workbench; your files are untouched.
</details>

<details>
<summary><strong>Why is a local backend required? Can't this be purely static?</strong></summary>

No. Opening editors and running builds depend on Node.js `child_process`, which the browser sandbox cannot do. This is the fundamental reason the project ships a local Express backend.
</details>

<details>
<summary><strong>Port 5177 is already in use. What should I do?</strong></summary>

Set the `PORT` environment variable to a different port. In development mode you must also update the `/api` proxy target in `vite.config.ts`.

```powershell
$env:PORT = "5178"; npm run start
```
</details>

<details>
<summary><strong>My editor isn't detected automatically.</strong></summary>

Detection uses `where` (Windows) / `command -v` (macOS / Linux), so the editor must be on your `PATH`. Undetected editors can still be selected manually; for custom install locations, add a custom editor in the settings.
</details>

<details>
<summary><strong>Builds fail with "npm / pnpm command not found".</strong></summary>

Builds run in the project root with `node_modules/.bin` injected into `PATH`. On Windows, processes are spawned with `shell: true` so that `npm.cmd` / `yarn.cmd` / `pnpm.cmd` resolve correctly. If it still fails, make sure the package manager is installed globally and on your `PATH`.
</details>

<details>
<summary><strong>The latest commit info doesn't show up.</strong></summary>

This requires Git installed locally, and the project must be a Git repository. Non-Git directories are silently skipped; read timeouts return `null` rather than raising an error.
</details>

<details>
<summary><strong>Tech stack detection is wrong or missing a framework.</strong></summary>

The rules live in two tables in `server/services/techStackDetect.js`: `DEP_TECH` (dependency-name mapping) and `FILE_TECH` (file / config mapping) — just add the missing entry. You can also right-click a project card and choose "Refresh tech stack" to re-detect.

Note: dependencies are processed in **ascending order of package name length** so that `vite` wins over `@vitejs/plugin-react`.
</details>

<details>
<summary><strong>Scanning is slow, or some projects are missed.</strong></summary>

Scanning stops descending once it hits `PROJECT_MARKERS` (20 marker files such as `package.json`, `go.mod`, `Cargo.toml`), and tech stacks are enriched afterwards by a bounded concurrency pool. Lower `scanMaxDepth` if scanning is too slow, or raise it if deeply nested projects are being missed. Directories without read permission are silently skipped.
</details>

<details>
<summary><strong>Why do build logs use both SSE and polling?</strong></summary>

SSE `log` events carry only incremental text; the server-side `job.logs` is the source of truth (the in-memory job table keeps up to 20 jobs, and each job is capped at 3000 log lines). The frontend polls `GET /api/builds/:id` every 1.2 s to backfill anything lost to a dropped stream.
</details>

<details>
<summary><strong>Why does cancelling a build use <code>taskkill</code> on Windows?</strong></summary>

A plain `process.kill()` cannot terminate the Windows child process tree (e.g. the real build process spawned by `npm.cmd`). `stopBuild()` therefore uses `taskkill /pid /t /f` on Windows to kill the entire tree.
</details>

<details>
<summary><strong>Electron binary download is very slow.</strong></summary>

Set a mirror and reinstall:

```powershell
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
npm install
```
</details>

---

## License

Released under the **[MIT License](./LICENSE)**.

You are free to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of this software, provided that **the above copyright notice and this permission notice are included in all copies or substantial portions of the Software**.

The software is provided "AS IS", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

See the [LICENSE](./LICENSE) file for the full text.

---

<div align="center">

If this project helps you, consider leaving a ⭐ Star.

</div>
