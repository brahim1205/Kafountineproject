import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, ToastType } from './toast.service';

const ICONS: Record<ToastType, string> = {
  success: 'ri-check-line',
  error: 'ri-error-warning-line',
  warning: 'ri-alert-line',
  info: 'ri-information-line',
};
const COLORS: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed top-0 left-0 right-0 z-50 flex flex-col items-center">
      @for (toast of toasts(); track toast.id; let index = $index) {
        <div
          [class]="colors[toast.type] + ' text-white px-6 py-4 rounded-b-lg shadow-xl flex items-center gap-3 w-full max-w-lg animate-slide-in-down'"
          [style.margin-top.px]="index * 10"
          role="status"
        >
          <i [class]="icons[toast.type] + ' text-xl'"></i>
          <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
          <button type="button" (click)="remove(toast.id)" class="text-white/80 hover:text-white transition-colors" aria-label="Fermer">
            <i class="ri-close-line text-lg"></i>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  private readonly service = inject(ToastService);
  protected readonly toasts = this.service.toasts;
  protected readonly icons = ICONS;
  protected readonly colors = COLORS;

  protected remove(id: string): void {
    this.service.remove(id);
  }
}
