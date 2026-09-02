import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  submenu?: MenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

const MENU_WIDTH = 200;
const ITEM_HEIGHT = 34;
const PADDING = 12;

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  // 子菜单浮层节点集合，用于关闭逻辑时排除，避免 hover 进子菜单误关父菜单
  const submenuRef = useRef<HTMLDivElement | null>(null);
  // 各菜单项按钮的 DOM 引用，用于子菜单相对触发项定位
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        if (submenuRef.current && submenuRef.current.contains(target)) return;
        onClose();
      }
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

  const height = items.length * ITEM_HEIGHT + PADDING;
  const left = Math.min(x, window.innerWidth - MENU_WIDTH - 8);
  const top = Math.min(y, window.innerHeight - height - 8);

  const hasSubmenu = items.some((i) => i.submenu?.length);

  return createPortal(
    <div
      ref={ref}
      style={{ left: Math.max(8, left), top: Math.max(8, top), minWidth: MENU_WIDTH }}
      className="fixed z-[70] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-fade-in dark:border-slate-700 dark:bg-slate-900"
    >
      {items.map((item) =>
        item.divider ? (
          <div key={item.key} className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
        ) : (
          <button
            key={item.key}
            ref={(el) => {
              itemRefs.current[item.key] = el;
            }}
            type="button"
            disabled={item.disabled || !item.onClick && !item.submenu}
            onMouseEnter={() => setOpenKey(item.submenu?.length ? item.key : null)}
            onClick={() => {
              if (item.submenu?.length) return;
              item.onClick?.();
              onClose();
            }}
            className={clsx(
              'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition',
              item.danger
                ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
              item.disabled && 'cursor-not-allowed opacity-40',
              openKey === item.key && !item.danger && 'bg-slate-100 dark:bg-slate-800'
            )}
          >
            {item.icon && <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span>}
            <span className="flex-1 truncate">{item.label}</span>
            {item.submenu?.length ? (
              <span className="text-slate-400 dark:text-slate-500">▸</span>
            ) : null}
          </button>
        )
      )}

      {hasSubmenu &&
        items.map((item) =>
          item.submenu?.length && openKey === item.key ? (
            <Submenu
              key={item.key}
              triggerRef={itemRefs.current[item.key]}
              items={item.submenu}
              onClose={onClose}
              submenuRef={submenuRef}
            />
          ) : null
        )}
    </div>,
    document.body
  );
}

interface SubmenuProps {
  triggerRef: HTMLButtonElement | null;
  items: MenuItem[];
  onClose: () => void;
  submenuRef: React.MutableRefObject<HTMLDivElement | null>;
}

function Submenu({ triggerRef, items, onClose, submenuRef }: SubmenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    submenuRef.current = ref.current;
    return () => {
      if (submenuRef.current === ref.current) submenuRef.current = null;
    };
  }, [submenuRef]);

  const trigger = triggerRef?.getBoundingClientRect();
  const subHeight = items.length * ITEM_HEIGHT + PADDING;
  if (!trigger) return null;

  // 相对触发项定位：右侧空间不足则向左展开，否则向右
  const preferLeft = trigger.right + 8 + MENU_WIDTH > window.innerWidth;
  const subLeft = preferLeft ? trigger.left - 8 - MENU_WIDTH : trigger.right + 8;
  const subTop = Math.min(trigger.top, window.innerHeight - subHeight - 8);

  return createPortal(
    <div
      ref={ref}
      style={{
        left: Math.max(8, subLeft),
        top: Math.max(8, subTop),
        minWidth: MENU_WIDTH,
      }}
      className="fixed z-[71] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-fade-in dark:border-slate-700 dark:bg-slate-900"
    >
      {items.map((sub) =>
        sub.divider ? (
          <div key={sub.key} className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
        ) : (
          <button
            key={sub.key}
            type="button"
            disabled={sub.disabled}
            onClick={() => {
              sub.onClick?.();
              onClose();
            }}
            className={clsx(
              'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition',
              sub.danger
                ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
              sub.disabled && 'cursor-not-allowed opacity-40'
            )}
          >
            {sub.icon && <span className="flex h-4 w-4 items-center justify-center">{sub.icon}</span>}
            <span className="truncate">{sub.label}</span>
          </button>
        )
      )}
    </div>,
    document.body
  );
}
