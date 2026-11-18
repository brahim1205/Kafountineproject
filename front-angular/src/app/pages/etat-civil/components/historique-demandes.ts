import { ChangeDetectionStrategy, Component, inject, input, output, signal, computed, effect, untracked } from '@angular/core';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { RecuPDF } from '../../../components/feature/recu-pdf';
import { EtatCivilDemande } from '../../../services/etat-civil';
import { ContribuableSelect, requireSelectedContribuable } from '../../../components/feature/contribuable-select';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../../utils/form-validation';
import { YearService } from '../../../core/year/year.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { serverList } from '../../../shared/utils/server-list';
import { EtatCivilApi } from '../../../services/etat-civil';

type UiEtatCivilDemande = EtatCivilDemande & {
  contribuableId: string;
  demandeur: string;
  cni: string;
  telephone: string;
  date: string;
  heure: string;
  agent: string;
};

@Component({
  selector: 'app-historique-demandes',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination, ContribuableSelect, RecuPDF],
  templateUrl: './historique-demandes.html',
})
export class HistoriqueDemandes {
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly yearService = inject(YearService);
  protected readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly etatCivilApi = inject(EtatCivilApi);
  readonly refreshKey = input<number>(0);

  readonly changed = output<void>();

  readonly statut = input<string | undefined>(undefined);

  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly filterType = signal('tous');

  protected readonly showRecuModal = signal(false);

  protected readonly showDetailModal = signal(false);

  protected readonly showEditModal = signal(false);

  protected readonly selectedDemande = signal<UiEtatCivilDemande | null>(null);

  protected readonly selectedEditDemande = signal<UiEtatCivilDemande | null>(null);

  protected readonly userRole = computed(() => this.auth.role());

  protected readonly list = serverList<UiEtatCivilDemande>(async ({ page, limit, search }) => {
    const { data, meta } = await this.etatCivilApi.pageEtatCivil({
    year: this.selectedYear(), page, limit, search,
    statut: this.statut(),
    type: this.filterType() === 'tous' ? undefined : this.filterType(),
    });
    return {
    meta,
    data: data.map((d: EtatCivilDemande): UiEtatCivilDemande => ({
    ...d,
    contribuableId: d.contribuable?.id || '',
    demandeur: d.contribuable ? `${d.contribuable.prenom || ''} ${d.contribuable.nom || ''}`.trim() : '-',
    cni: d.contribuable?.nin || '',
    telephone: d.contribuable?.telephone || '-',
    date: d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
    heure: d.date ? new Date(d.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
    agent: d.agent || 'Agent Municipal',
    })),
    };
    }, computed(() => [this.selectedYear(), this.filterType(), this.statut()]));

  protected readonly filteredDemandes = computed(() => this.list.items());

  protected readonly typesDocuments = signal<string[]>([]);

  protected readonly filterTypes = computed(() => Array.from(new Set([...this.typesDocuments(), ...this.list.items().map((demande) => demande.typeDocument)].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr')));

  protected handleVoir(demande: UiEtatCivilDemande) {
    this.selectedDemande.set(demande);
    this.showDetailModal.set(true);
    }

  protected handleImprimer(demande: UiEtatCivilDemande) {
    this.selectedDemande.set(demande);
    this.showRecuModal.set(true);
    }

  protected handleEdit(demande: UiEtatCivilDemande) {
    this.selectedEditDemande.set(demande);
    this.showEditModal.set(true);
    }

  protected async handleUpdateDemande(e: Event) {
    e.preventDefault();
    if (!this.selectedEditDemande())
    return;
    if (!validateFormElement((e.currentTarget as HTMLFormElement)))
    return;
    const form = (e.currentTarget as HTMLFormElement);
    const contribuableId = requireSelectedContribuable(form, 'contribuableId');
    if (!contribuableId)
    return;
    const formData = new FormData(form);
    const typeDocument = String(formData.get('typeDocument') || '');
    const montant = Number(formData.get('montant') || 0);
    const exemplaires = Number(formData.get('exemplaires') || 1);
    const statut = String(formData.get('statut') || 'DELIVREE');
    try {
    await this.etatCivilApi.updateEtatCivilDemande(this.selectedEditDemande()!.id, {
    typeDocument,
    contribuableId,
    montant,
    exemplaires,
    statut,
    });
    this.toast.show('Demande mise à jour avec succès.', 'success');
    this.showEditModal.set(false);
    this.selectedEditDemande.set(null);
    this.list.reload();
    this.changed.emit();
    }
    catch (error) {
    this.toast.show(getErrorMessage(error, 'Erreur lors de la mise à jour.'), 'error');
    }
    }

  protected async handleDeleteDemande() {
    if (!this.selectedEditDemande())
    return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette demande définitivement ? Cette action est irréversible."))
    return;
    try {
    await this.etatCivilApi.deleteEtatCivilDemande(this.selectedEditDemande()!.id);
    this.toast.show('Demande supprimée avec succès.', 'success');
    this.showEditModal.set(false);
    this.selectedEditDemande.set(null);
    this.list.reload();
    this.changed.emit();
    }
    catch (error) {
    this.toast.show(getErrorMessage(error, 'Erreur lors de la suppression.'), 'error');
    }
    }

  protected fromSummary() {
    return Array.from(new Set([this.selectedEditDemande()!.typeDocument, ...this.typesDocuments()].filter(Boolean)));
  }

  constructor() {
    effect(() => {
      this.refreshKey();
      untracked(() => {
    if (this.refreshKey())
    this.list.reload();
      });
    });
    effect(() => {
      
      untracked(() => {
    this.etatCivilApi.getEtatCivilDocumentTypes().then((types) => this.typesDocuments.set(types.map((type) => type.nom)))
    .catch(() => this.typesDocuments.set([]));
      });
    });
  }
}
