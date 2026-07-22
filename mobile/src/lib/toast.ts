export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

type ToastListener = (items: ToastItem[]) => void;

const MAX_VISIBLE = 3;

let queue: ToastItem[] = [];
let activeListener: ToastListener | null = null;
let sequence = 0;

function emit() {
  activeListener?.(queue);
}

function push(variant: ToastVariant, title: string, message?: string) {
  sequence += 1;
  queue = [...queue.slice(1 - MAX_VISIBLE), { id: `toast-${sequence}`, variant, title, message }];
  emit();
}

export function subscribeToToasts(listener: ToastListener) {
  activeListener = listener;
  listener(queue);
  return () => {
    if (activeListener === listener) activeListener = null;
  };
}

export function dismissToast(id: string) {
  queue = queue.filter((item) => item.id !== id);
  emit();
}

export function showSuccess(title: string, message?: string) {
  push('success', title, message);
}

export function showError(title: string, message?: string) {
  push('error', title, message);
}

export function showAlert(title: string, message: string) {
  push('info', title, message);
}
