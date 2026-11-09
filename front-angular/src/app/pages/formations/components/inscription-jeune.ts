import { ChangeDetectionStrategy, Component, input, output, signal, linkedSignal, computed } from '@angular/core';
import { FormationType, JeuneType } from '../page';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../../utils/form-validation';

@Component({
  selector: 'app-inscription-jeune',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './inscription-jeune.html',
})
export class InscriptionJeune {
  protected readonly clearFieldValidationError = clearFieldValidationError;

  readonly formations = input.required<FormationType[]>();

  readonly preselectedFormationId = input<string | undefined>(undefined);

  readonly closed = output<void>();

  readonly add = output<JeuneType>();

  protected readonly errorMsg = signal('');

  protected readonly formData = linkedSignal(() => ({
    formationId: this.preselectedFormationId() || '',
    nom: '',
    prenom: '',
    cni: '',
    telephone: '',
    adresse: '',
    niveauEtude: '',
    sexe: '',
    dateNaissance: '',
    photo: '',
    }));

  protected readonly formationsActives = computed(() => this.formations().filter((f) => f.statut === 'En cours'));

  protected readonly selectedFormation = computed(() => this.formations().find((f) => f.id === this.formData().formationId));

  protected handleSubmit(e: Event) {
    e.preventDefault();
    if (!validateFormElement((e.currentTarget as HTMLFormElement))) {
    return;
    }
    const newJeune: JeuneType = {
    id: 'JEU' + Date.now().toString().slice(-6),
    formationId: this.formData().formationId,
    nom: this.formData().nom,
    prenom: this.formData().prenom,
    cni: this.formData().cni,
    telephone: this.formData().telephone,
    adresse: this.formData().adresse,
    niveauEtude: this.formData().niveauEtude,
    sexe: this.formData().sexe,
    dateNaissance: this.formData().dateNaissance,
    photo: this.formData().photo || '',
    dateInscription: new Date().toISOString().split('T')[0],
    tauxAssiduite: 100,
    statutFinal: 'En cours',
    presences: 0,
    absences: 0,
    };
    try {
    this.errorMsg.set('');
    this.add.emit(newJeune);
    this.closed.emit();
    }
    catch (error) {
    this.errorMsg.set(getErrorMessage(error, "L'inscription du jeune a échoué."));
    }
    }

  protected onFormationIdChange(e: Event) {
    return this.formData.set({ ...this.formData(), formationId: (e.target as HTMLInputElement).value });
  }

  protected onPrenomChange(e: Event) {
    return this.formData.set({ ...this.formData(), prenom: (e.target as HTMLInputElement).value });
  }

  protected onNomChange(e: Event) {
    return this.formData.set({ ...this.formData(), nom: (e.target as HTMLInputElement).value });
  }

  protected onCniChange(e: Event) {
    return this.formData.set({ ...this.formData(), cni: (e.target as HTMLInputElement).value });
  }

  protected onTelephoneChange(e: Event) {
    return this.formData.set({ ...this.formData(), telephone: (e.target as HTMLInputElement).value });
  }

  protected onAdresseChange(e: Event) {
    return this.formData.set({ ...this.formData(), adresse: (e.target as HTMLInputElement).value });
  }

  protected onNiveauEtudeChange(e: Event) {
    return this.formData.set({ ...this.formData(), niveauEtude: (e.target as HTMLInputElement).value });
  }

  protected onSexeChange(e: Event) {
    return this.formData.set({ ...this.formData(), sexe: (e.target as HTMLInputElement).value });
  }

  protected onDateNaissanceChange(e: Event) {
    return this.formData.set({ ...this.formData(), dateNaissance: (e.target as HTMLInputElement).value });
  }

  protected onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
    this.formData.set({
    ...this.formData(),
    photo: URL.createObjectURL(file),
    });
    }
    }
}
