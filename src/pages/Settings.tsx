import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowLeft,
  Check,
  Database,
  Download,
  Hammer,
  Monitor,
  Moon,
  Plus,
  ScanLine,
  Settings as SettingsIcon,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { toast } from '@/stores/toastStore';
import { api } from '@/lib/api';
import { getIcon } from '@/lib/icons';
import type { SortBy, ThemeMode, ViewMode } from '@/types';

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'custom', label: '自定义（可拖拽）' },
  { value: 'name', label: '按名称' },
  { value: 'pinyin', label: '按名称拼音' },
  { value: 'lastUpdated', label: '按最后更新时间' },
  { value: 'createdAt', label: '按创建时间' },
  { value: 'size', label: '按项目体积' },
];

export default function Settings() {
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const patch = useSettingsStore((s) => s.patch);
  const editors = useSettingsStore((s) => s.editors);
  const loadEditors = useSettingsStore((s) => s.loadEditors);
  const addEditor = useSettingsStore((s) => s.addEditor);
  const removeEditor = useSettingsStore((s) => s.removeEditor);
  const platform = useSettingsStore((s) => s.platform);
  const setAllProjects = useProjectStore((s) => s.setAll);
  const setSort = useProjectStore((s) => s.setSort);
  const setViewMode = useProjectStore((s) => s.setViewMode);
  const projects = useProjectStore((s) => s.projects);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setAllWorkspaces = useWorkspaceStore((s) => s.setAll);

  const [newEditor, setNewEditor] = useState({ name: '', command: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editors.length) void loadEditors();
  }, [editors.length, loadEditors]);

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await api.importData(payload);
      const boot = await api.bootstrap();
      setAllWorkspaces(boot.workspaces);
      setAllProjects(boot.projects);
      useSettingsStore.getState().hydrate({ settings: boot.settings, platform: boot.platform, homeDir: boot.homeDir });
      toast.success('数据已恢复');
    } catch (err) {
      toast.error(`导入失败：${(err as Error).message}`);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          返回工作台
        </button>
        <div className="ml-auto flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <SettingsIcon className="h-4 w-4" />
          设置
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
          {/* 外观 */}
          <Card title="外观" description="主题与默认展示方式">
            <Row label="主题模式">
              <div className="flex gap-1.5">
                {THEMES.map((t) => {
                  const Icon = t.icon;
                  const active = settings.theme === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => patch({ theme: t.value })}
                      className={clsx(
                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition',
                        active
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </Row>
            <Row label="默认视图">
              <div className="flex gap-1.5">
                {(['grid', 'list'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      patch({ viewMode: mode });
                      setViewMode(mode);
                    }}
                    className={clsx(
                      'rounded-lg border px-3 py-1.5 text-xs transition',
                      settings.viewMode === mode
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    )}
                  >
                    {mode === 'grid' ? '网格' : '列表'}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="默认排序">
              <select
                value={settings.sortBy}
                onChange={(e) => {
                  const sortBy = e.target.value as SortBy;
                  patch({ sortBy });
                  setSort(sortBy, settings.sortDir);
                }}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Row>
          </Card>

          {/* 编辑器 */}
          <Card
            title="编辑器"
            description={`当前系统：${platform}。绿色标记表示已在本机检测到该命令。`}
            action={
              <button
                type="button"
                onClick={() => void loadEditors()}
                className="text-xs text-slate-400 transition hover:text-indigo-500"
              >
                重新检测
              </button>
            }
          >
            <div className="space-y-1.5">
              {editors.map((editor) => {
                const Icon = getIcon(editor.icon);
                const active = settings.defaultEditorId === editor.id;
                return (
                  <div
                    key={editor.id}
                    className={clsx(
                      'flex items-center gap-3 rounded-lg border px-3 py-2 transition',
                      active
                        ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-800'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm text-slate-800 dark:text-slate-100">{editor.name}</span>
                        {editor.installed ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1 text-[10px] text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <Check className="h-2.5 w-2.5" />
                            已安装
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                            未检测到
                          </span>
                        )}
                        {editor.custom && (
                          <span className="rounded bg-violet-50 px-1 text-[10px] text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                            自定义
                          </span>
                        )}
                      </div>
                      <p className="truncate font-mono text-[11px] text-slate-400">{editor.command}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => patch({ defaultEditorId: editor.id })}
                      className={clsx(
                        'shrink-0 rounded-lg border px-2.5 py-1 text-[11px] transition',
                        active
                          ? 'border-indigo-300 bg-white text-indigo-600 dark:border-indigo-500/40 dark:bg-slate-900 dark:text-indigo-300'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                      )}
                    >
                      {active ? '默认' : '设为默认'}
                    </button>
                    {editor.custom && (
                      <button
                        type="button"
                        onClick={() => void removeEditor(editor.id)}
                        aria-label={`删除 ${editor.name}`}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">添加自定义编辑器</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={newEditor.name}
                  onChange={(e) => setNewEditor((v) => ({ ...v, name: e.target.value }))}
                  placeholder="名称，如 Neovim"
                  className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  value={newEditor.command}
                  onChange={(e) => setNewEditor((v) => ({ ...v, command: e.target.value }))}
                  placeholder="命令，如 nvim"
                  className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newEditor.name.trim() || !newEditor.command.trim()) {
                      toast.error('请填写名称和命令');
                      return;
                    }
                    const ok = await addEditor({ name: newEditor.name.trim(), command: newEditor.command.trim() });
                    if (ok) setNewEditor({ name: '', command: '' });
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加
                </button>
              </div>
            </div>
          </Card>

          {/* 构建 */}
          <Card title="构建" description="一键打包使用的默认命令">
            <Row label="默认构建命令">
              <input
                value={settings.buildCommand}
                onChange={(e) => patch({ buildCommand: e.target.value })}
                placeholder="npm run build"
                className="w-full max-w-xs rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </Row>
            <Row label="构建前确认">
              <Toggle
                checked={settings.confirmBeforeBuild}
                onChange={(v) => patch({ confirmBeforeBuild: v })}
                labelOn="每次都确认"
                labelOff="直接执行"
              />
            </Row>
            <p className="flex items-start gap-1.5 text-[11px] leading-5 text-slate-400">
              <Hammer className="mt-0.5 h-3 w-3 shrink-0" />
              单个项目可在「编辑项目」中覆盖此命令；命令在项目根目录执行，已自动注入 node_modules/.bin 到 PATH。
            </p>
          </Card>

          {/* 扫描 */}
          <Card title="扫描" description="批量导入项目时的默认行为">
            <Row label="默认扫描深度">
              <select
                value={settings.scanMaxDepth}
                onChange={(e) => patch({ scanMaxDepth: Number(e.target.value) })}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>
                    {d} 层
                  </option>
                ))}
              </select>
            </Row>
            <p className="flex items-start gap-1.5 text-[11px] leading-5 text-slate-400">
              <ScanLine className="mt-0.5 h-3 w-3 shrink-0" />
              扫描会自动跳过 node_modules、.git、dist 等依赖与构建目录。
            </p>
          </Card>

          {/* 数据 */}
          <Card title="数据" description={`当前共 ${workspaces.length} 个工作区、${projects.length} 个项目`}>
            <div className="flex flex-wrap gap-2">
              <a
                href={api.exportUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                导出备份
              </a>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Upload className="h-3.5 w-3.5" />
                导入备份
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImport(file);
                  e.target.value = '';
                }}
              />
            </div>
            <p className="flex items-start gap-1.5 text-[11px] leading-5 text-slate-400">
              <Database className="mt-0.5 h-3 w-3 shrink-0" />
              所有数据仅保存在本机 <code className="font-mono">server/data/store.json</code>，不会上传到任何服务器。导入备份会覆盖当前全部数据。
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  labelOn,
  labelOff,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
    >
      <span
        className={clsx(
          'relative h-5 w-9 rounded-full transition',
          checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
            checked ? 'left-[1.125rem]' : 'left-0.5'
          )}
        />
      </span>
      {checked ? labelOn : labelOff}
    </button>
  );
}
