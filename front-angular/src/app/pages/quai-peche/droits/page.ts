import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { PayeurField } from '../../../components/feature/payeur-field';
import { RecuPDF } from '../../../components/feature/recu-pdf';
import { TaxesApi, TaxService } from '../../../services/taxes';
import { ModePaiement } from '../../../shared/ui/mode-paiement/mode-paiement';
import { getErrorMessage } from '../../../utils/form-validation';

/** Droits du quai de l'arrêté du 8 mai 2024 que l'agent du quai enregistre lui-même (le serveur refuse les autres). */
const DROITS = [
  { categorie: 'stationnement-transport', nom: 'Transport maritime - Pecheurs saisonniers', libelle: 'Pêcheur saisonnier', article: 'IX-15' },
  { categorie: 'stationnement-transport', nom: 'Transport poisson - Moto chargeant poisson', libelle: 'Moto chargeant du poisson', article: 'V-25' },
  { categorie: 'marche', nom: 'Etals - Poissonnerie (etalage)', libelle: 'Poissonnerie (étalage)', article: 'IV-9' },
] as const;

type Droit = { categorie: string; nom: string; libelle: string; article: string; tarif: number; unite: string };
type Recu = { numero: string; date: string; heure: string; payeur: string; service: string; montant: number; agent: string };

const INPUT_CLASS = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

@Component({
  selector: 'app-droits-quai',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PayeurField, ModePaiement, RecuPDF, RouterLink],
  templateUrl: './page.html',
})
export class DroitsQuaiPage {
  private readonly taxesApi = inject(TaxesApi);
  private readonly auth = inject(AuthService);
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly Math = Math;

  private readonly payeur = viewChild.required(PayeurField);
  protected readonly droits = signal<Droit[]>([]);
  protected readonly choix = signal(0);
  protected readonly quantite = signal(1);
  protected readonly mode = signal('ESPECE');
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly recu = signal<Recu | null>(null);

  protected readonly droit = computed(() => this.droits()[this.choix()] ?? null);
  protected readonly total = computed(() => (this.droit()?.tarif ?? 0) * this.quantite());

  constructor() {
    void this.chargerTarifs();
  }

  /** Les tarifs viennent du catalogue (modifiable dans les paramètres), jamais d'une valeur codée ici. */
  private async chargerTarifs(): Promise<void> {
    try {
      const parCategorie = new Map<string, TaxService[]>();
      for (const categorie of new Set(DROITS.map((d) => d.categorie))) parCategorie.set(categorie, await this.taxesApi.getTaxServices(categorie));
      this.droits.set(DROITS.flatMap((d) => {
        const service = parCategorie.get(d.categorie)?.find((s) => s.nom === d.nom);
        return service ? [{ ...d, tarif: service.tarif, unite: service.unite }] : [];
      }));
    } catch (err) {
      this.error.set(getErrorMessage(err, 'Impossible de charger les tarifs du quai.'));
    }
  }

  protected montant(value: number): string {
    return `${value.toLocaleString('fr-FR')} FCFA`;
  }

  protected async enregistrer(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const droit = this.droit();
    if (!droit || this.submitting()) return;
    this.submitting.set(true);
    this.error.set('');
    try {
      const contribuableId = await this.payeur().resoudre(form);
      if (!contribuableId) return;
      const ticket = await this.taxesApi.createTransaction({
        contribuableId, categorie: droit.categorie, type: droit.categorie, service: droit.nom,
        quantite: this.quantite(), montant: this.total(), modePaiement: this.mode(), reference: '',
      });
      const now = new Date();
      const payeur = this.payeur().nomAffiche(form);
      this.recu.set({
        numero: ticket.numero, date: now.toISOString().slice(0, 10), heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        payeur, service: `${droit.libelle} × ${this.quantite()} ${droit.unite}`, montant: ticket.montant ?? this.total(), agent: this.auth.userName() || '',
      });
      form.reset();
      this.quantite.set(1);
    } catch (err) {
      this.error.set(getErrorMessage(err, "Le droit n'a pas pu être enregistré."));
    } finally {
      this.submitting.set(false);
    }
  }
}
