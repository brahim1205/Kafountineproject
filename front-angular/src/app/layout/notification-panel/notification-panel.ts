import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { AppNotification, NotificationService } from '../../core/notifications/notification.service';
import { YearService } from '../../core/year/year.service';

type Filtre = 'toutes' | 'paiement' | 'retard' | 'alerte';

const COLORS: Record<string, string> = { paiement: 'emerald', retard: 'red', alerte: 'orange' };
const ICONS: Record<string, string> = {
  paiement: 'ri-money-dollar-circle-line',
  retard: 'ri-alert-line',
  alerte: 'ri-alarm-warning-line',
};

@Component({
  selector: 'app-notification-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification-panel.html',
})
export class NotificationPanel {
  private readonly service = inject(NotificationService);
  private readonly year = inject(YearService);

  readonly isOpen = input.required<boolean>();
  readonly closed = output<void>();

  protected readonly notifications = signal<AppNotification[]>([]);
  protected readonly filtre = signal<Filtre>('toutes');
  protected readonly clignotement = signal(false);
  protected readonly nonLues = computed(() => this.notifications().filter((n) => !n.lu).length);
  protected readonly filtrees = computed(() => {
    const filtre = this.filtre();
    return this.notifications().filter((n) => filtre === 'toutes' || n.type === filtre);
  });
  protected readonly filtres: { value: Filtre; label: string; active: string }[] = [
    { value: 'toutes', label: 'Toutes', active: 'bg-emerald-600 text-white' },
    { value: 'paiement', label: 'Paiements', active: 'bg-emerald-600 text-white' },
    { value: 'retard', label: 'Retards', active: 'bg-red-600 text-white' },
    { value: 'alerte', label: 'Alertes', active: 'bg-orange-600 text-white' },
  ];

  constructor() {
    effect(() => {
      if (!this.isOpen()) return;
      this.service.list(this.year.selectedYear()).subscribe((data) => this.notifications.set(data));
    });
    effect((onCleanup) => {
      if (!this.notifications().some((n) => !n.lu && n.type === 'alerte')) return;
      const interval = setInterval(() => this.clignotement.update((value) => !value), 800);
      onCleanup(() => clearInterval(interval));
    });
  }

  protected marquerCommeLu(id: string): void {
    this.service.markRead(id).subscribe({ error: () => undefined });
    this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, lu: true } : n)));
  }

  protected marquerToutCommeLu(): void {
    this.service.markAllRead().subscribe({ error: () => undefined });
    this.notifications.update((list) => list.map((n) => ({ ...n, lu: true })));
  }

  protected tempsEcoule(timestamp: string): string {
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    const heures = Math.floor(minutes / 60);
    if (heures < 24) return `Il y a ${heures}h`;
    return `Il y a ${Math.floor(heures / 24)}j`;
  }

  protected icon(type: string): string {
    return ICONS[type] ?? 'ri-notification-3-line';
  }

  protected iconBox(notification: AppNotification): string {
    return `bg-${COLORS[notification.type] ?? 'gray'}-${notification.lu ? '10' : '20'}`;
  }

  protected iconColor(notification: AppNotification): string {
    return `text-${COLORS[notification.type] ?? 'gray'}-600`;
  }
}
