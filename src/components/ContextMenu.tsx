import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose]);

  const width = 200;
  const height = items.length * 34 + 12;
  const left = Math.min(x, window.innerWidth - width - 8);
  const top = Math.min(y, window.innerHeight - height - 8);

  return createPortal(
    <div
      ref={ref}
      style={{ left: Math.max(8, left), top: Math.max(8, top), minWidth: width }}
      className="fixed z-[70] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-fade-in dark:border-slate-700 dark:bg-slate-900"
    >
      {items.map((item) =>
        item.divider ? (
          <div key={item.key} className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
        ) : (
          <button
            key={item.key}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className={clsx(
              'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition',
              item.danger
                ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
              item.disabled && 'cursor-not-allowed opacity-40'
            )}
          >
            {item.icon && <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
          </button>
        )
      )}
    </div>,
    document.body
  );
}
