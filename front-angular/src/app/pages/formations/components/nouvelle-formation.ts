import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormationType } from '../page';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../../utils/form-validation';

@Component({
  selector: 'app-nouvelle-formation',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './nouvelle-formation.html',
})
export class NouvelleFormation {
  protected readonly clearFieldValidationError = clearFieldValidationError;

  readonly closed = output<void>();

  readonly add = output<FormationType>();

  protected readonly errorMsg = signal('');

  protected readonly formData = signal({
    nom: '',
    domaine: '',
    duree: '',
    responsable: '',
    budget: '',
    dateDebut: '',
    dateFin: '',
    });

  protected handleSubmit(e: Event) {
    e.preventDefault();
    if (!validateFormElement((e.currentTarget as HTMLFormElement))) {
    return;
    }
    const newFormation: FormationType = {
    id: 'FORM' + Date.now().toString().slice(-6),
    nom: this.formData().nom,
    domaine: this.formData().domaine,
    duree: this.formData().duree,
    responsable: this.formData().responsable,
    budget: Number(this.formData().budget) || 0,
    dateDebut: this.formData().dateDebut,
    dateFin: this.formData().dateFin,
    statut: 'En cours',
    nombreInscrits: 0,
    nombreCertifies: 0,
    tauxReussite: 0,
    };
    try {
    this.errorMsg.set('');
    this.add.emit(newFormation);
    this.closed.emit();
    }
    catch (error) {
    this.errorMsg.set(getErrorMessage(error, 'La création de la formation a échoué.'));
    }
    }

  protected onNomChange(e: Event) {
    return this.formData.set({ ...this.formData(), nom: (e.target as HTMLInputElement).value });
  }

  protected onDomaineChange(e: Event) {
    return this.formData.set({ ...this.formData(), domaine: (e.target as HTMLInputElement).value });
  }

  protected onDureeChange(e: Event) {
    return this.formData.set({ ...this.formData(), duree: (e.target as HTMLInputElement).value });
  }

  protected onResponsableChange(e: Event) {
    return this.formData.set({ ...this.formData(), responsable: (e.target as HTMLInputElement).value });
  }

  protected onBudgetChange(e: Event) {
    return this.formData.set({ ...this.formData(), budget: (e.target as HTMLInputElement).value });
  }

  protected onDateDebutChange(e: Event) {
    return this.formData.set({ ...this.formData(), dateDebut: (e.target as HTMLInputElement).value });
  }

  protected onDateFinChange(e: Event) {
    return this.formData.set({ ...this.formData(), dateFin: (e.target as HTMLInputElement).value });
  }
}
