import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToastStore } from '@/stores/toastStore';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const STYLES = {
  success: {
    icon: CheckCircle2,
    wrap: 'border-emerald-200 bg-white text-slate-800 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-slate-100',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: AlertTriangle,
    wrap: 'border-rose-200 bg-white text-slate-800 dark:border-rose-500/30 dark:bg-slate-900 dark:text-slate-100',
    iconColor: 'text-rose-500',
  },
  info: {
    icon: Info,
    wrap: 'border-sky-200 bg-white text-slate-800 dark:border-sky-500/30 dark:bg-slate-900 dark:text-slate-100',
    iconColor: 'text-sky-500',
  },
} as const;

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => {
      // 由 store 自行过期，这里仅保证卸载时清理
    }, 0);
    return () => clearTimeout(timer);
  }, [toasts.length]);

  if (!toasts.length) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const style = STYLES[t.type];
        const Icon = style.icon;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-lg animate-slide-up ${style.wrap}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`} />
            <span className="flex-1 break-words leading-5">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="关闭提示"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
