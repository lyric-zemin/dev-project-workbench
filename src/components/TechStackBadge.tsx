import clsx from 'clsx';
import { CATEGORY_META } from '@/lib/format';
import type { TechStack } from '@/types';

interface TechStackBadgeProps {
  tech: TechStack;
  active?: boolean;
  onClick?: (name: string) => void;
  size?: 'sm' | 'md';
  showCategory?: boolean;
}

export default function TechStackBadge({
  tech,
  active = false,
  onClick,
  size = 'sm',
  showCategory = false,
}: TechStackBadgeProps) {
  const meta = CATEGORY_META[tech.category] ?? CATEGORY_META.other;
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      {...(onClick
        ? {
            type: 'button' as const,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onClick(tech.name);
            },
            title: `按「${tech.name}」筛选`,
          }
        : {})}
      className={clsx(
        'inline-flex max-w-full items-center gap-1 rounded-md ring-1 ring-inset transition',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
        meta.chip,
        onClick && 'hover:brightness-95 dark:hover:brightness-125',
        active && 'ring-2 ring-indigo-500 dark:ring-indigo-400'
      )}
    >
      <span className="truncate font-medium">{tech.name}</span>
      {tech.version && <span className="shrink-0 opacity-60">{tech.version}</span>}
      {showCategory && <span className="shrink-0 opacity-50">· {meta.label}</span>}
    </Comp>
  );
}
