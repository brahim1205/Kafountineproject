import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { StatsCard } from './components/stats-card';
import { FormationCard } from './components/formation-card';
import { JeuneCard } from './components/jeune-card';
import { NouvelleFormation } from './components/nouvelle-formation';
import { InscriptionJeune } from './components/inscription-jeune';
import { StatistiquesFormations } from './components/statistiques-formations';
import { DetailFormation } from './components/detail-formation';
import { AttestationFormation } from './components/attestation-formation';
import { AuthService } from '../../core/auth/auth.service';
import { Attestation, Formation, Jeune, JeuneFormationEnrollment, FormationStats } from '../../services/formations';
import { YearService } from '../../core/year/year.service';
import { FormationsApi } from '../../services/formations';

export interface FormationType {
  id: string;
  nom: string;
  domaine: string;
  duree: string;
  responsable: string;
  budget: number;
  dateDebut: string;
  dateFin: string;
  statut: string;
  nombreInscrits: number;
  nombreCertifies: number;
  tauxReussite: number;
}

export interface JeuneType {
  id: string;
  formationId: string;
  nom: string;
  prenom: string;
  cni: string;
  telephone: string;
  adresse: string;
  niveauEtude: string;
  sexe: string;
  dateNaissance: string;
  photo: string;
  dateInscription: string;
  tauxAssiduite: number;
  statutFinal: string;
  presences: number;
  absences: number;
}

const EMPTY_FORMATION_STATS: FormationStats = {
  totalFormations: 0,
  formationsEnCours: 0,
  formationsTerminees: 0,
  totalJeunesFormes: 0,
  totalCertifies: 0,
  tauxReussiteGlobal: 0,
  budgetTotal: 0,
  repartitionDomaines: [],
  repartitionSexe: [],
  evolutionAnnuelle: [],
};

function mapFormationToUi(item: Formation): FormationType {
  return {
    id: item.id,
    nom: item.nom,
    domaine: item.domaine,
    duree: item.duree,
    responsable: item.responsable,
    budget: item.budget,
    dateDebut: item.dateDebut,
    dateFin: item.dateFin,
    statut: item.statut === 'EN_COURS' ? 'En cours' : item.statut === 'TERMINEE' ? 'Terminée' : item.statut === 'ANNULEE' ? 'Annulée' : 'Planifiée',
    nombreInscrits: item.nombreInscrits || 0,
    nombreCertifies: item.nombreCertifies || 0,
    tauxReussite: item.tauxReussite || 0,
  };
}

function mapJeuneToUi(jeune: Jeune, enrollment: JeuneFormationEnrollment | null): JeuneType {
  return {
    id: jeune.id,
    formationId: enrollment?.formationId || '',
    nom: jeune.nom,
    prenom: jeune.prenom,
    cni: jeune.cni,
    telephone: jeune.telephone,
    adresse: jeune.adresse,
    niveauEtude: jeune.niveauEtude,
    sexe: jeune.sexe,
    dateNaissance: jeune.dateNaiss,
    photo: jeune.photo || '',
    dateInscription: enrollment?.dateInscription || jeune.createdAt || '',
    tauxAssiduite: enrollment?.tauxAssiduite || 0,
    statutFinal: enrollment?.statutFinal || 'En cours',
    presences: enrollment?.presences || 0,
    absences: enrollment?.absences || 0,
  };
}

@Component({
  selector: 'app-formations-page',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatsCard, FormationCard, JeuneCard, StatistiquesFormations, NouvelleFormation, InscriptionJeune, DetailFormation, AttestationFormation],
  templateUrl: './page.html',
})
export class FormationsPage {
  protected readonly yearService = inject(YearService);
  protected readonly formationsApi = inject(FormationsApi);
  protected readonly auth = inject(AuthService);
  protected readonly activeTab = signal<'formations' | 'jeunes' | 'statistiques'>('formations');

  protected readonly formationsList = signal<FormationType[]>([]);

  protected readonly jeunesList = signal<JeuneType[]>([]);

  protected readonly formationsStats = signal<FormationStats>(EMPTY_FORMATION_STATS);

  protected readonly showNouvelleFormation = signal(false);

  protected readonly showInscriptionJeune = signal(false);

  protected readonly selectedFormationId = signal<string>('');

  protected readonly showDetailFormation = signal(false);

  protected readonly searchTerm = signal('');

  protected readonly filterStatut = signal<string>('tous');

  protected readonly filterDomaine = signal<string>('tous');

  protected readonly successMsg = signal('');

  protected readonly errorMsg = signal('');

  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected toApiStatus(status: string) {
    if (status === 'En cours')
    return 'EN_COURS';
    if (status === 'Terminée')
    return 'TERMINEE';
    if (status === 'Annulée')
    return 'ANNULEE';
    return 'PLANIFIEE';
    }

  protected async loadData() {
    try {
    this.errorMsg.set('');
    const year = this.selectedYear() || new Date().getFullYear();
    const [formations, jeunes, stats] = await Promise.all([
    this.formationsApi.listFormations(year),
    this.formationsApi.listJeunes(year),
    this.formationsApi.getFormationStats(year)
    ]);
    this.formationsList.set((formations || []).map(mapFormationToUi));
    const mappedJeunes: JeuneType[] = [];
    (jeunes || []).forEach((j: Jeune) => {
    const entries = Array.isArray(j.formations) && j.formations.length > 0 ? j.formations : [null];
    entries.forEach((enroll) => {
    mappedJeunes.push(mapJeuneToUi(j, enroll));
    });
    });
    this.jeunesList.set(mappedJeunes.filter((j) => j.formationId));
    this.formationsStats.set(stats || EMPTY_FORMATION_STATS);
    }
    catch {
    this.formationsList.set([]);
    this.jeunesList.set([]);
    this.formationsStats.set(EMPTY_FORMATION_STATS);
    this.errorMsg.set("Impossible de charger les données des formations.");
    }
    }

  protected showSuccess(msg: string) {
    this.errorMsg.set('');
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 3000);
    }

  protected async handleAddFormation(formation: FormationType) {
    const year = this.selectedYear() || new Date().getFullYear();
    try {
    await this.formationsApi.createFormation({
    nom: formation.nom,
    domaine: formation.domaine,
    duree: formation.duree,
    responsable: formation.responsable,
    budget: formation.budget,
    dateDebut: formation.dateDebut,
    dateFin: formation.dateFin,
    statut: this.toApiStatus(formation.statut),
    year: year,
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    await this.loadData();
    this.showSuccess('Formation créée avec succès !');
    }
    catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de la création.";
    this.errorMsg.set(errorMessage);
    }
    }

  protected async handleEditFormation(updated: FormationType) {
    try {
    await this.formationsApi.updateFormation(updated.id, {
    nom: updated.nom,
    domaine: updated.domaine,
    duree: updated.duree,
    responsable: updated.responsable,
    budget: updated.budget,
    dateDebut: updated.dateDebut,
    dateFin: updated.dateFin,
    statut: this.toApiStatus(updated.statut),
    year: this.selectedYear(),
    });
    await this.loadData();
    this.showSuccess('Formation modifiée avec succès !');
    }
    catch (error) {
    this.errorMsg.set(error instanceof Error ? error.message : 'Erreur lors de la modification.');
    }
    }

  protected async handleDeleteFormation(id: string) {
    try {
    await this.formationsApi.deleteFormation(id);
    await this.loadData();
    this.showSuccess('Formation supprimée avec succès !');
    }
    catch (error) {
    this.errorMsg.set(error instanceof Error ? error.message : 'Erreur lors de la suppression.');
    }
    }

  protected async handleAddJeune(jeune: JeuneType) {
    try {
    const created = await this.formationsApi.createJeune({
    nom: jeune.nom,
    prenom: jeune.prenom,
    cni: jeune.cni,
    telephone: jeune.telephone,
    adresse: jeune.adresse,
    niveauEtude: jeune.niveauEtude,
    sexe: jeune.sexe,
    dateNaiss: jeune.dateNaissance,
    year: this.selectedYear(),
    });
    await this.formationsApi.inscrireJeuneFormation(created.id, jeune.formationId);
    await this.loadData();
    this.showSuccess(`${jeune.prenom} ${jeune.nom} inscrit(e) avec succès !`);
    }
    catch (error) {
    this.errorMsg.set(error instanceof Error ? error.message : "Erreur lors de l'inscription.");
    }
    }

  /** Agent, régisseur ou super administrateur, sur l'année en cours : pointer, retirer, clôturer. */
  protected readonly canManage = computed(() => this.auth.canWriteRole() && this.selectedYear() === new Date().getFullYear());

  protected readonly attestation = signal<Attestation | null>(null);

  protected async handlePresence(event: { jeuneId: string; present: boolean }) {
    try {
    this.errorMsg.set('');
    await this.formationsApi.pointerPresence(event.jeuneId, this.selectedFormationId(), event.present);
    await this.loadData();
    }
    catch (error) {
    this.errorMsg.set(error instanceof Error ? error.message : 'Impossible de pointer la présence.');
    }
    }

  protected async handleCloture() {
    try {
    this.errorMsg.set('');
    const resultat = await this.formationsApi.cloturerFormation(this.selectedFormationId());
    await this.loadData();
    this.showSuccess(`Session clôturée : ${resultat.certifies} certifié(s) sur ${resultat.inscrits}.`);
    }
    catch (error) {
    this.errorMsg.set(error instanceof Error ? error.message : 'Impossible de clôturer la session.');
    }
    }

  protected async handleAttestation(jeuneId: string) {
    try {
    this.errorMsg.set('');
    this.attestation.set(await this.formationsApi.getAttestation(jeuneId, this.selectedFormationId()));
    }
    catch (error) {
    this.errorMsg.set(error instanceof Error ? error.message : "Impossible de produire l'attestation.");
    }
    }

  /** Retire le jeune de la formation sans supprimer sa fiche. */
  protected async handleRemoveJeune(jeuneId: string) {
    const jeune = this.jeunesList().find(j => j.id === jeuneId);
    if (!jeune)
    return;
    try {
    await this.formationsApi.desinscrireJeuneFormation(jeuneId, this.selectedFormationId());
    await this.loadData();
    this.showSuccess(`${jeune.prenom} ${jeune.nom} retiré(e) de la formation.`);
    }
    catch (error) {
    this.errorMsg.set(error instanceof Error ? error.message : 'Erreur lors de la suppression du jeune.');
    }
    }

  protected readonly formationsEnCours = computed(() => this.formationsList().filter(f => f.statut === 'En cours'));

  protected readonly formationsTerminees = computed(() => this.formationsList().filter(f => f.statut === 'Terminée'));

  protected readonly totalJeunes = computed(() => this.jeunesList().length);

  protected readonly jeunesCertifies = computed(() => this.jeunesList().filter(j => j.statutFinal === 'Certifié').length);

  protected readonly filteredFormations = computed(() => this.formationsList().filter(formation => {
    const matchSearch = formation.nom.toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    formation.domaine.toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    formation.responsable.toLowerCase().includes(this.searchTerm().toLowerCase());
    const matchStatut = this.filterStatut() === 'tous' || formation.statut === this.filterStatut();
    const matchDomaine = this.filterDomaine() === 'tous' || formation.domaine === this.filterDomaine();
    return matchSearch && matchStatut && matchDomaine;
    }));

  protected readonly filteredJeunes = computed(() => this.jeunesList().filter(jeune => {
    const formation = this.formationsList().find(f => f.id === jeune.formationId);
    const matchSearch = jeune.nom.toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    jeune.prenom.toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    jeune.cni.includes(this.searchTerm()) ||
    (formation?.nom.toLowerCase().includes(this.searchTerm().toLowerCase()) ?? false);
    return matchSearch;
    }));

  protected readonly domaines = computed(() => Array.from(new Set(this.formationsList().map(f => f.domaine))));

  protected getJeunesForFormation(formationId: string) {
    return this.jeunesList().filter(j => j.formationId === formationId);
  }

  protected asSummary() {
    return (['formations', 'jeunes', 'statistiques'] as const);
  }

  protected formationsListSummary() {
    return this.formationsList().find(f => f.id === this.selectedFormationId())!;
  }

  constructor() {
    effect(() => {
      
      untracked(() => {
    this.loadData();
      });
    });
  }
}
