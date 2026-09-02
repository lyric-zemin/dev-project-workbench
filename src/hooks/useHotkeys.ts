import { useEffect } from 'react';

export interface HotkeyHandlers {
  onSearch?: () => void;
  onNew?: () => void;
  onSettings?: () => void;
}

function isEditable(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

/** 全局快捷键：Ctrl/Cmd + F 搜索，Ctrl/Cmd + N 新建项目，Ctrl/Cmd + S 设置 */
export function useHotkeys({ onSearch, onNew, onSettings }: HotkeyHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (key === 'f') {
        e.preventDefault();
        const input = document.getElementById('global-search') as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
        } else {
          onSearch?.();
        }
        return;
      }

      if (isEditable(e.target)) return;

      if (key === 'n') {
        e.preventDefault();
        onNew?.();
      } else if (key === 's') {
        e.preventDefault();
        onSettings?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSearch, onNew, onSettings]);
}
