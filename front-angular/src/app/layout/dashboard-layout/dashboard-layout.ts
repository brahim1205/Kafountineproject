import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { UiRole } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { AVAILABLE_YEARS, YearService } from '../../core/year/year.service';
import { allMenuItems, ORDRE_REGISSEUR, playNotificationSound, roleLabels } from '../menu';
import { NotificationPanel } from '../notification-panel/notification-panel';
import { IncidentsApi } from '../../services/incidents';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  link: string;
}

interface TransactionHit {
  id?: string;
  numero?: string;
  service?: string;
  montant?: number | string;
  contribuable?: { prenom?: string; nom?: string };
}

const SEARCH_DELAY_MS = 300;

@Component({
  selector: 'app-dashboard-layout',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterOutlet, NgTemplateOutlet, NotificationPanel],
  templateUrl: './dashboard-layout.html',
})
export class DashboardLayout {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly incidentsApi = inject(IncidentsApi);
  private readonly document = inject(DOCUMENT);
  private readonly searchBox = viewChild<ElementRef<HTMLElement>>('searchBox');

  protected readonly year = inject(YearService);
  protected readonly years = AVAILABLE_YEARS;
  protected readonly sidebarOpen = signal(true);
  protected readonly mobileSidebarOpen = signal(false);
  protected readonly mobileViewport = signal(window.innerWidth < 768);
  protected readonly showNotifications = signal(false);
  protected readonly showUserMenu = signal(false);
  protected readonly searchQuery = signal('');

  /** La recherche porte sur les tickets : le quai de pêche n'y a pas accès. */
  protected readonly canSearch = computed(() => this.auth.role() !== 'quai_peche');
  protected readonly searchResults = signal<SearchResult[]>([]);
  protected readonly showSearchDropdown = signal(false);
  protected readonly unread = signal(0);
  /** Incidents techniques non encore pris en charge : compteur affiché dans le menu du super admin. */
  protected readonly incidentsNouveaux = signal(0);
  protected readonly currentPath = signal(this.router.url.split('?')[0]);

  protected readonly role = computed<UiRole>(() => this.auth.role() ?? 'admin');
  protected readonly canWrite = this.auth.canWrite;
  protected readonly userName = computed(() => (this.role() === 'admin' ? 'Mr le Maire' : (this.auth.session()?.userName ?? '')));
  protected readonly userInitials = computed(() => (this.role() === 'admin' ? 'MR' : (this.auth.session()?.userInitials ?? '')));
  protected readonly roleLabel = computed(() => roleLabels[this.role()]);
  protected readonly menuItems = computed(() => {
    const items = allMenuItems.filter((item) => item.roles.includes(this.role()));
    if (this.role() !== 'regisseur') return items;
    // Une entrée absente de l'ordre prévu (nouveau module) passe en fin de menu plutôt que de disparaître.
    const rang = (path: string) => {
      const index = ORDRE_REGISSEUR.indexOf(path);
      return index === -1 ? ORDRE_REGISSEUR.length : index;
    };
    return [...items].sort((a, b) => rang(a.path) - rang(b.path));
  });
  protected readonly avatarClass = computed(() => {
    const role = this.role();
    if (role === 'admin' || role === 'service_finances') return 'bg-emerald-100 text-emerald-700';
    return role === 'agent' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700';
  });

  private previousUnread = 0;
  private firstLoad = true;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const media = window.matchMedia('(max-width: 767px)');
    const onViewport = (event: MediaQueryListEvent | MediaQueryList) => this.mobileViewport.set(event.matches);
    onViewport(media);
    media.addEventListener('change', onViewport);
    destroyRef.onDestroy(() => media.removeEventListener('change', onViewport));

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.currentPath.set((event as NavigationEnd).urlAfterRedirects.split('?')[0]);
        this.mobileSidebarOpen.set(false);
        this.showNotifications.set(false);
        this.showUserMenu.set(false);
        this.showSearchDropdown.set(false);
      });

    effect(() => {
      this.currentPath();
      if (this.role() !== 'super_admin') return;
      this.incidentsApi
        .stats()
        .then((stats) => this.incidentsNouveaux.set(stats.nouveau))
        .catch(() => this.incidentsNouveaux.set(0));
    });

    effect(() => {
      this.document.body.style.overflow = this.mobileViewport() && this.mobileSidebarOpen() ? 'hidden' : '';
    });

    effect(() => {
      this.showNotifications();
      this.notifications.list(this.year.selectedYear()).subscribe((data) => this.onNotifications(data.filter((n) => !n.lu).length));
    });

    effect((onCleanup) => {
      const query = this.searchQuery().trim();
      if (query.length < 2) {
        this.searchResults.set([]);
        this.showSearchDropdown.set(false);
        return;
      }
      const timer = setTimeout(() => this.search(query), SEARCH_DELAY_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected isActive(path: string): boolean {
    return this.currentPath() === path;
  }

  protected toggleSidebar(): void {
    if (this.mobileViewport()) this.mobileSidebarOpen.set(true);
    else this.sidebarOpen.update((open) => !open);
  }

  protected openResult(link: string): void {
    void this.router.navigateByUrl(link);
    this.showSearchDropdown.set(false);
    this.searchQuery.set('');
  }

  protected onYearChange(value: string): void {
    this.year.select(Number(value));
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  @HostListener('document:mousedown', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.searchBox()?.nativeElement.contains(event.target as Node)) this.showSearchDropdown.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.showSearchDropdown.set(false);
    this.searchQuery.set('');
  }

  private onNotifications(count: number): void {
    if (!this.firstLoad && count > this.previousUnread) {
      playNotificationSound();
      navigator.vibrate?.([200, 100, 200]);
    }
    this.unread.set(count);
    this.previousUnread = count;
    this.firstLoad = false;
  }

  private search(query: string): void {
    this.api.getPage<TransactionHit>('/transactions', { page: 1, limit: 5, search: query }).subscribe({
      next: ({ data }) => {
        const results = data.slice(0, 8).map((taxe): SearchResult => {
          const contribuable = `${taxe.contribuable?.prenom || ''} ${taxe.contribuable?.nom || ''}`.trim();
          return {
            id: String(taxe.id || taxe.numero),
            title: String(taxe.numero || '-'),
            subtitle: `${contribuable || '-'} • ${taxe.service} • ${Number(taxe.montant || 0).toLocaleString('fr-FR')} FCFA`,
            icon: 'ri-file-list-3-line',
            link: '/recettes',
          };
        });
        this.searchResults.set(results);
        this.showSearchDropdown.set(results.length > 0);
      },
      error: () => this.searchResults.set([]),
    });
  }
}
