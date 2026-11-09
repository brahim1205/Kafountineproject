import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { Commission, Pecheur, Embarcation, QuaiPecheStats } from '../../../services/quai-peche';
import { Moto } from '../../../services/motos';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { PlaceMarche } from '../../../services/marche';
import { YearService } from '../../../core/year/year.service';
import { AuthService } from '../../../core/auth/auth.service';
import { QuaiPecheApi } from '../../../services/quai-peche';
import { MotosApi } from '../../../services/motos';
import { MarcheApi } from '../../../services/marche';

function normalizeStatus(value?: string | null): string {
  return String(value || '').trim().toUpperCase();
}

function displayStatus(value?: string | null): string {
  const normalized = normalizeStatus(value);
  switch (normalized) {
    case 'ENREGISTREE':
      return 'Enregistrée';
    case 'VALIDEE':
      return 'Validée';
    case 'ACTIF':
      return 'Actif';
    case 'INACTIF':
      return 'Inactif';
    case 'EN_MAINTENANCE':
      return 'En maintenance';
    case 'OCCUPEE':
      return 'Occupée';
    case 'DISPONIBLE':
      return 'Libre';
    default:
      return value || 'Inconnu';
  }
}

type DashboardMarketPlace = PlaceMarche & {
  occupantName: string;
};

@Component({
  selector: 'app-quai-peche-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination],
  templateUrl: './quai-peche-dashboard.html',
})
export class QuaiPecheDashboard {
  protected readonly normalizeStatus = normalizeStatus;
  protected readonly displayStatus = displayStatus;
  protected readonly yearService = inject(YearService);
  protected readonly auth = inject(AuthService);
  protected readonly quaiPecheApi = inject(QuaiPecheApi);
  protected readonly motosApi = inject(MotosApi);
  protected readonly marcheApi = inject(MarcheApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected readonly activeTab = signal<'commissions' | 'pecheurs' | 'embarcations' | 'motos' | 'marche'>('commissions');

  protected readonly userName = computed(() => this.auth.userName() || 'Responsable Quai');

  protected readonly pecheurs = signal<Pecheur[]>([]);

  protected readonly embarcations = signal<Embarcation[]>([]);

  protected readonly commissions = signal<Commission[]>([]);

  protected readonly quaiStats = signal<QuaiPecheStats | null>(null);

  protected readonly motos = signal<Moto[]>([]);

  protected readonly placesMarche = signal<DashboardMarketPlace[]>([]);

  protected readonly loading = signal(true);

  protected readonly errorMsg = signal('');

  protected readonly searchTerm = signal('');

  protected readonly statutFilter = signal('all');

  protected readonly page = signal(1);

  protected readonly meta = signal({ total: 0, totalPages: 1 });

  protected readonly appliedSearch = signal('');

  protected readonly totalCommissions = computed(() => this.quaiStats()?.totalCommissions ?? this.commissions().length);

  protected readonly totalPoids = computed(() => this.quaiStats()?.totalPoids ?? this.commissions().reduce((sum, c) => sum + (c.poids || 0), 0));

  protected readonly commissionsEnAttente = computed(() => this.quaiStats()?.commissionsEnAttente ?? this.commissions().filter((c) => normalizeStatus(c.statut) === 'ENREGISTREE').length);

  protected readonly totalPecheurs = computed(() => this.quaiStats()?.totalPecheurs ?? this.pecheurs().filter((p) => normalizeStatus(p.statut) === 'ACTIF').length);

  protected readonly filteredCommissions = computed(() => this.commissions().filter(c => {
    const matchSearch = (c.numero || '').toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    (c.pecheur?.nom || '').toLowerCase().includes(this.searchTerm().toLowerCase());
    const matchStatut = this.statutFilter() === 'all' || normalizeStatus(c.statut) === this.statutFilter();
    return matchSearch && matchStatut;
    }));

  protected readonly filteredPecheurs = computed(() => this.pecheurs().filter(p => {
    const matchSearch = (p.nom || '').toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    (p.prenom || '').toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    (p.telephone || '').includes(this.searchTerm());
    const matchStatut = this.statutFilter() === 'all' || normalizeStatus(p.statut) === this.statutFilter();
    return matchSearch && matchStatut;
    }));

  protected readonly filteredEmbarcations = computed(() => this.embarcations().filter(e => {
    const matchSearch = (e.nom || '').toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    (e.immatriculation || '').toLowerCase().includes(this.searchTerm().toLowerCase());
    const matchStatut = this.statutFilter() === 'all' || normalizeStatus(e.statut) === this.statutFilter();
    return matchSearch && matchStatut;
    }));

  protected readonly filteredMotos = computed(() => Array.isArray(this.motos()) ? this.motos().filter((m) => {
    const matchSearch = (m.matricule || '').toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    (`${m.proprietaire?.prenom || ''} ${m.proprietaire?.nom || ''}`.trim().toLowerCase()).includes(this.searchTerm().toLowerCase()) ||
    (m.marque || '').toLowerCase().includes(this.searchTerm().toLowerCase());
    const matchStatut = this.statutFilter() === 'all' || normalizeStatus(m.statut) === this.statutFilter();
    return matchSearch && matchStatut;
    }) : []);

  protected readonly filteredPlacesMarche = computed(() => Array.isArray(this.placesMarche()) ? this.placesMarche().filter((p) => {
    const matchSearch = (p.numeroPlace || p.numero || '').toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    p.occupantName.toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    (p.zone || '').toLowerCase().includes(this.searchTerm().toLowerCase());
    const matchStatut = this.statutFilter() === 'all' || normalizeStatus(p.statut) === this.statutFilter();
    return matchSearch && matchStatut;
    }) : []);

  protected async handleValidate(id: string) {
    if (!this.isCurrentYear())
    return;
    try {
    await this.quaiPecheApi.validateCommission(id);
    this.commissions.set(this.commissions().map(c => c.id === id ? { ...c, statut: 'VALIDEE' } : c));
    }
    catch {
    this.errorMsg.set("Impossible de valider la commission.");
    }
    }

  protected readonly tabs = computed(() => [
    { id: 'commissions', label: 'Commissions', icon: 'ri-snowy-line' },
    { id: 'pecheurs', label: 'Pêcheurs', icon: 'ri-user-line' },
    { id: 'embarcations', label: 'Embarcations', icon: 'ri-ship-line' },
    { id: 'motos', label: 'Motos Jakarta', icon: 'ri-motorbike-line' },
    { id: 'marche', label: 'Marché', icon: 'ri-store-2-line' },
    ] as const);

  protected formatToLocaleDateString(item: { date: string | number | Date }) {
    return new Date(item.date).toLocaleDateString('fr-FR');
  }

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      this.searchTerm();
      const cleanup = untracked(() => (() => {
    const timer = window.setTimeout(() => this.appliedSearch.set(this.searchTerm().trim()), 300);
    return () => window.clearTimeout(timer);
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
    effect((onCleanup) => {
      void onCleanup;
      this.activeTab(); this.statutFilter(); this.appliedSearch(); this.selectedYear();
      const cleanup = untracked(() => (() => this.page.set(1))());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
    effect(() => {
      this.selectedYear();
      untracked(() => {
    this.quaiPecheApi.getQuaiPecheStats(this.selectedYear()).then((stats) => this.quaiStats.set(stats || null)).catch(() => this.quaiStats.set(null));
      });
    });
    effect((onCleanup) => {
      void onCleanup;
      this.selectedYear(); this.activeTab(); this.page(); this.appliedSearch(); this.statutFilter();
      const cleanup = untracked(() => (() => {
    let active = true;
    const params = { year: this.selectedYear(), page: this.page(), limit: 25, search: this.appliedSearch(), statut: this.statutFilter() === 'all' ? '' : this.statutFilter() };
    const apply = <T,>(setter: (rows: T[]) => void) => (result: {
    data: T[];
    meta: {
    total: number;
    totalPages?: number;
    };
    }) => {
    if (!active)
    return;
    setter(result.data || []);
    this.meta.set({ total: result.meta.total, totalPages: result.meta.totalPages || 1 });
    };
    this.loading.set(true);
    this.errorMsg.set('');
    const load = (): Promise<void> => {
    switch (this.activeTab()) {
    case 'commissions': return this.quaiPecheApi.pageCommissions(params).then(apply(value => this.commissions.set(value)));
    case 'pecheurs': return this.quaiPecheApi.pagePecheurs(params).then(apply(value => this.pecheurs.set(value)));
    case 'embarcations': return this.quaiPecheApi.pageEmbarcations(params).then(apply(value => this.embarcations.set(value)));
    case 'motos': return this.motosApi.pageMotos({ year: this.selectedYear(), page: this.page(), limit: 25, search: this.appliedSearch() }).then(apply(value => this.motos.set(value)));
    default:
    return this.marcheApi.listPlacesMarche(this.selectedYear()).then((placesData) => {
    if (!active)
    return;
    this.placesMarche.set((placesData || []).map((place) => ({
    ...place,
    occupantName: typeof place.occupant === 'string' ? place.occupant : '-',
    })));
    this.meta.set({ total: placesData.length, totalPages: 1 });
    });
    }
    };
    load()
    .catch(() => {
    if (active)
    this.errorMsg.set("Impossible de charger les données du quai de pêche.");
    })
    .finally(() => {
    if (active)
    this.loading.set(false);
    });
    return () => {
    active = false;
    };
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
