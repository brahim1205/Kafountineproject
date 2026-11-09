import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const TOAST_DURATION_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly state = signal<Toast[]>([]);
  readonly toasts = this.state.asReadonly();

  show(message: string, type: ToastType = 'info'): void {
    const id = crypto.randomUUID();
    this.state.update((toasts) => [...toasts, { id, message, type }]);
    setTimeout(() => this.remove(id), TOAST_DURATION_MS);
  }

  remove(id: string): void {
    this.state.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
