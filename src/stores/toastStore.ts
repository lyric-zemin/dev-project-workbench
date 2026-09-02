import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
}

interface ToastState {
  toasts: ToastItem[];
  push: (type: ToastType, message: string, action?: ToastAction) => void;
  dismiss: (id: string) => void;
}

let seed = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (type, message, action) => {
    seed += 1;
    const id = `toast_${seed}`;
    set({ toasts: [...get().toasts, { id, type, message, action }] });
    setTimeout(() => get().dismiss(id), type === 'error' ? 5000 : 2800);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (message: string, action?: ToastAction) =>
    useToastStore.getState().push('success', message, action),
  error: (message: string, action?: ToastAction) =>
    useToastStore.getState().push('error', message, action),
  info: (message: string, action?: ToastAction) =>
    useToastStore.getState().push('info', message, action),
};
