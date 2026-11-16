import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CaisseApi, Cloture, JournalCaisse, SyntheseCaisse } from '../../services/caisse';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AnnulationModal } from '../../shared/ui/annulation-modal/annulation-modal';
import { libelleMode } from '../../shared/ui/mode-paiement/mode-paiement';
import { getErrorMessage } from '../../utils/form-validation';

const SUPERVISEURS = new Set<string>(['admin', 'super_admin', 'regisseur', 'service_finances']);
const aujourdhui = () => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-caisse',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AnnulationModal, RouterLink],
  templateUrl: './page.html',
})
export class Caisse {
  private readonly api = inject(CaisseApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly libelleMode = libelleMode;
  protected readonly maxDate = aujourdhui();
  protected readonly superviseur = computed(() => SUPERVISEURS.has(this.auth.role() ?? ''));
  protected readonly peutEcrire = computed(() => this.auth.canWriteRole());

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  /** Page de détail /caisse/agent/:agentId : la caisse d'un agent seule, avec un retour vers la liste. */
  protected readonly agentId = computed(() => this.params().get('agentId') ?? undefined);
  protected readonly detail = computed(() => this.agentId() !== undefined);
  /** La journée suit l'adresse (?date=), pour la garder entre la liste et le détail. */
  protected readonly date = computed(() => {
    const value = this.query().get('date');
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : aujourdhui();
  });
  protected readonly monId = computed(() => this.auth.userId());
  protected readonly journal = signal<JournalCaisse | null>(null);
  protected readonly synthese = signal<SyntheseCaisse | null>(null);
  protected readonly montantCompte = signal('');
  protected readonly observations = signal('');
  protected readonly busy = signal(false);
  protected readonly erreur = signal('');
  protected readonly aRouvrir = signal<Cloture | null>(null);

  protected readonly modes = computed(() => Object.entries(this.journal()?.parMode ?? {}));
  protected readonly sources = computed(() => Object.entries(this.journal()?.parSource ?? {}));
  protected readonly ecart = computed(() => {
    const saisi = this.montantCompte();
    return saisi === '' ? null : Number(saisi) - (this.journal()?.total ?? 0);
  });
  protected readonly peutCloturer = computed(() => {
    const ecart = this.ecart();
    return ecart !== null && Number(this.montantCompte()) >= 0 && (ecart === 0 || this.observations().trim().length > 0) && !this.busy();
  });

  constructor() {
    effect(() => {
      this.date();
      this.agentId();
      untracked(() => void this.charger());
    });
  }

  protected montant(value: number): string {
    return `${value.toLocaleString('fr-FR')} FCFA`;
  }

  protected heure(value: string): string {
    return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  protected changerDate(value: string): void {
    if (!value) return;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { date: value }, replaceUrl: true });
  }

  /**
   * Liste (responsables) : le tableau de tous les agents, sans détail en dessous.
   * Détail, ou agent qui consulte sa propre caisse : le journal seul.
   */
  private async charger(): Promise<void> {
    this.erreur.set('');
    const liste = this.superviseur() && !this.detail();
    try {
      const [journal, synthese] = await Promise.all([
        liste ? Promise.resolve(null) : this.api.journal(this.date(), this.agentId()),
        liste ? this.api.synthese(this.date()) : Promise.resolve(null),
      ]);
      this.journal.set(journal);
      this.synthese.set(synthese);
      this.montantCompte.set('');
      this.observations.set('');
    } catch (error) {
      this.erreur.set(getErrorMessage(error, 'Impossible de charger la caisse.'));
    }
  }

  protected async cloturer(): Promise<void> {
    const journal = this.journal();
    if (!journal) return;
    this.busy.set(true);
    try {
      await this.api.cloturer({ date: journal.date, agentId: journal.agentId, montantCompte: Number(this.montantCompte()), observations: this.observations().trim() || undefined });
      this.toast.show('Caisse clôturée.', 'success');
      await this.charger();
    } catch (error) {
      this.toast.show(getErrorMessage(error, 'Impossible de clôturer la caisse.'), 'error');
    } finally {
      this.busy.set(false);
    }
  }

  protected async valider(cloture: Cloture): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.valider(cloture.id);
      this.toast.show('Clôture validée.', 'success');
      await this.charger();
    } catch (error) {
      this.toast.show(getErrorMessage(error, 'Impossible de valider la clôture.'), 'error');
    } finally {
      this.busy.set(false);
    }
  }

  protected async rouvrir(motif: string): Promise<void> {
    const cloture = this.aRouvrir();
    if (!cloture) return;
    this.busy.set(true);
    try {
      await this.api.rouvrir(cloture.id, motif);
      this.toast.show('Caisse rouverte.', 'success');
      this.aRouvrir.set(null);
      await this.charger();
    } catch (error) {
      this.toast.show(getErrorMessage(error, 'Impossible de rouvrir la caisse.'), 'error');
    } finally {
      this.busy.set(false);
    }
  }
}
