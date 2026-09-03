import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import clsx from 'clsx';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, ChevronDown, FilterX, LayoutGrid, List, Search, Tag } from 'lucide-react';
import { SORT_OPTIONS } from '@/constants/sort';
import { STATUS_META } from '@/constants/project';
import { collectTechNames } from '@/lib/filters';
import type { Project, ProjectStatus, SortBy, ViewMode } from '@/types';

interface SearchFilterProps {
  projects: Project[];
  visibleCount: number;
  search: string;
  onSearch: (value: string) => void;
  /** 供外部（如 Ctrl+F 快捷键）聚焦并选中搜索框内容 */
  inputRef?: RefObject<HTMLInputElement>;
  statuses: ProjectStatus[];
  onToggleStatus: (status: ProjectStatus) => void;
  techs: string[];
  onToggleTech: (tech: string) => void;
  onClear: () => void;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  sortBy: SortBy;
  sortDir: 'asc' | 'desc';
  onSort: (sortBy: SortBy, sortDir?: 'asc' | 'desc') => void;
  onToggleSortDir: () => void;
}

export default function SearchFilter({
  projects,
  visibleCount,
  search,
  onSearch,
  inputRef,
  statuses,
  onToggleStatus,
  techs,
  onToggleTech,
  onClear,
  viewMode,
  onViewMode,
  sortBy,
  sortDir,
  onSort,
  onToggleSortDir,
}: SearchFilterProps) {
  const [techOpen, setTechOpen] = useState(false);
  const [techQuery, setTechQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allTechs = useMemo(() => collectTechNames(projects), [projects]);
  const filteredTechs = useMemo(
    () => (techQuery ? allTechs.filter((t) => t.toLowerCase().includes(techQuery.trim().toLowerCase())) : allTechs),
    [allTechs, techQuery]
  );

  useEffect(() => {
    if (!techOpen) return;
    const onDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setTechOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [techOpen]);

  const hasFilter = Boolean(search || statuses.length || techs.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* 搜索框 */}
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="搜索项目名称 / 路径 / 技术栈…（Ctrl+F）"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 状态过滤 */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            {(Object.keys(STATUS_META) as ProjectStatus[]).map((status) => {
              const active = statuses.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onToggleStatus(status)}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition',
                    active
                      ? STATUS_META[status].chip + ' ring-1 ring-inset'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  )}
                >
                  <span className={clsx('h-1.5 w-1.5 rounded-full', STATUS_META[status].dot)} />
                  {STATUS_META[status].label}
                </button>
              );
            })}
          </div>

          {/* 技术栈过滤 */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setTechOpen((v) => !v)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition',
                techs.length
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
            >
              <Tag className="h-3.5 w-3.5" />
              技术栈
              {techs.length > 0 && (
                <span className="rounded bg-indigo-600 px-1 text-[10px] text-white">{techs.length}</span>
              )}
              <ChevronDown className={clsx('h-3.5 w-3.5 transition', techOpen && 'rotate-180')} />
            </button>
            {techOpen && (
              <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-fade-in dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 p-2 dark:border-slate-800">
                  <input
                    autoFocus
                    value={techQuery}
                    onChange={(e) => setTechQuery(e.target.value)}
                    placeholder="查找技术栈…"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {filteredTechs.length === 0 && (
                    <p className="px-2 py-3 text-center text-xs text-slate-400">暂无匹配的技术栈</p>
                  )}
                  {filteredTechs.map((tech) => {
                    const active = techs.includes(tech);
                    return (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => onToggleTech(tech)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <span
                          className={clsx(
                            'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
                            active
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          )}
                        >
                          {active && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span className="truncate">{tech}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {hasFilter && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs text-slate-500 transition hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
            >
              <FilterX className="h-3.5 w-3.5" />
              清空
            </button>
          )}

          <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" />

          {/* 视图切换 */}
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => onViewMode('grid')}
              aria-label="网格视图"
              className={clsx(
                'rounded-lg p-1.5 transition',
                viewMode === 'grid'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewMode('list')}
              aria-label="列表视图"
              className={clsx(
                'rounded-lg p-1.5 transition',
                viewMode === 'list'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 排序 + 结果统计 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          共 <span className="font-semibold text-slate-700 dark:text-slate-200">{visibleCount}</span> 个项目
          {hasFilter && <span className="ml-1 text-slate-400">（已按条件过滤）</span>}
          {sortBy === 'custom' && <span className="ml-2 text-slate-400">· 当前为自定义排序，可直接拖拽卡片调整顺序</span>}
        </p>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => onSort(e.target.value as SortBy)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                按{opt.label}排序
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onToggleSortDir}
            title={sortDir === 'asc' ? '当前升序，点击切换降序' : '当前降序，点击切换升序'}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {sortDir === 'asc' ? <ArrowUpNarrowWide className="h-3.5 w-3.5" /> : <ArrowDownWideNarrow className="h-3.5 w-3.5" />}
            {sortDir === 'asc' ? '升序' : '降序'}
          </button>
        </div>
      </div>
    </div>
  );
}
