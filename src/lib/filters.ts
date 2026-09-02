import type { Project, SortBy, SortDir } from '@/types';

export interface FilterOptions {
  workspaceId: string; // 'all' 表示全部项目
  search: string;
  statuses: Project['status'][];
  techs: string[];
}

const collator = typeof Intl !== 'undefined' && 'Collator' in Intl ? new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' }) : null;

export function matchSearch(project: Project, keyword: string): boolean {
  if (!keyword) return true;
  const kw = keyword.trim().toLowerCase();
  if (!kw) return true;
  const haystack = [project.name, project.path, ...project.techStack.map((t) => t.name)];
  if (project.description) haystack.push(project.description);
  return haystack.some((field) => field.toLowerCase().includes(kw));
}

export function filterProjects(projects: Project[], options: FilterOptions): Project[] {
  const { workspaceId, search, statuses, techs } = options;
  return projects.filter((p) => {
    if (workspaceId !== 'all' && p.workspaceId !== workspaceId) return false;
    if (statuses.length && !statuses.includes(p.status)) return false;
    if (techs.length && !techs.every((t) => p.techStack.some((s) => s.name === t))) return false;
    return matchSearch(p, search);
  });
}

const byName = (a: Project, b: Project) => a.name.localeCompare(b.name, 'zh-Hans-CN');
const byPinyin = (a: Project, b: Project) =>
  collator ? collator.compare(a.name, b.name) : a.name.localeCompare(b.name);
const byTime = (key: 'lastUpdated' | 'createdAt') => (a: Project, b: Project) =>
  new Date(a[key]).getTime() - new Date(b[key]).getTime();
const bySize = (a: Project, b: Project) => (a.size || 0) - (b.size || 0);

export function sortProjects(projects: Project[], sortBy: SortBy, sortDir: SortDir): Project[] {
  const list = projects.slice();
  if (sortBy === 'custom') {
    return list.sort((a, b) => (sortDir === 'asc' ? 1 : -1) * (a.order - b.order));
  }
  let compare: (a: Project, b: Project) => number;
  switch (sortBy) {
    case 'name':
      compare = byName;
      break;
    case 'pinyin':
      compare = byPinyin;
      break;
    case 'lastUpdated':
      compare = byTime('lastUpdated');
      break;
    case 'createdAt':
      compare = byTime('createdAt');
      break;
    case 'size':
      compare = bySize;
      break;
    default:
      compare = byName;
  }
  const dir = sortDir === 'asc' ? 1 : -1;
  return list.sort((a, b) => dir * compare(a, b));
}

export function collectTechNames(projects: Project[]): string[] {
  const set = new Set<string>();
  projects.forEach((p) => p.techStack.forEach((t) => set.add(t.name)));
  return [...set].sort((a, b) => a.localeCompare(b));
}
