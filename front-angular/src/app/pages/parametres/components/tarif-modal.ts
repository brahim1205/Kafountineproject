import { ChangeDetectionStrategy, Component, inject, input, output, signal, computed } from '@angular/core';
import { Tarif } from '../../../services/settings';
import { clearFieldValidationError, validateFormElement } from '../../../utils/form-validation';
import { INPUT_CLASS } from './ui';
import { Label } from './label';
import { Modal } from './modal';
import { ModalActions } from './modal-actions';
import { SettingsApi } from '../../../services/settings';

const UNITES = [
  'par acte', 'par jour', 'par mois', 'par an', 'par permis', 'par cérémonie', 'par m²', 'par m²/an', 'par dossier',
  'par parcelle', 'par opération', 'par unité', 'par unité/jour', 'par chargement', 'par passage', 'par séance',
  'par tête', 'par voyage', 'par pompe/mois', 'par infraction', 'par colis', 'par saison', 'par an ou par jour',
  'aller-retour', 'forfait', 'unique', 'autre',
];

@Component({
  selector: 'app-tarif-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Label, ModalActions],
  templateUrl: './tarif-modal.html',
})
export class TarifModal {
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly settingsApi = inject(SettingsApi);
  readonly tarif = input<Tarif | undefined>(undefined);

  readonly categories = input.required<string[]>();

  readonly closed = output<void>();

  readonly saved = output<string>();

  readonly failed = output<string>();

  protected readonly submitting = signal(false);

  protected readonly unites = computed(() => this.tarif() && !UNITES.includes(this.tarif()!.unite) ? [this.tarif()!.unite, ...UNITES] : UNITES);

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    if (!validateFormElement((e.currentTarget as HTMLFormElement))) {
    return;
    }
    const formData = new FormData((e.currentTarget as HTMLFormElement));
    const values = {
    categorie: formData.get('categorie') as string,
    nom: formData.get('nom') as string,
    montant: Number(formData.get('montant')),
    unite: formData.get('unite') as string,
    description: (formData.get('description') as string) || undefined,
    actif: formData.get('actif') === 'on',
    };
    this.submitting.set(true);
    try {
    if (this.tarif()) {
    await this.settingsApi.updateTarif(this.tarif()!.id, values);
    this.saved.emit('Tarif modifié avec succès !');
    }
    else {
    await this.settingsApi.createTarif(values);
    this.saved.emit('Tarif créé avec succès !');
    }
    }
    catch (error) {
    this.failed.emit(error instanceof Error ? error.message : 'Impossible d’enregistrer le tarif.');
    }
    finally {
    this.submitting.set(false);
    }
    }
}
