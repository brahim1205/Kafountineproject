import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { MotoPayment } from '../../../services/motos';
import { clearFieldValidationError, validateFormElement } from '../../../utils/form-validation';
import { Field, INPUT_CLASS } from './field';
import { FormError } from './form-error';
import { MotosApi } from '../../../services/motos';
import { ContribuablesApi } from '../../../services/contribuables';
import { UploadApi } from '../../../services/upload';

const MATRICULE_DUPLIQUE = 'Ce numéro de matricule est déjà utilisé par une autre moto.';

const PERMIS_DUPLIQUE = 'Ce numéro de permis de conduire est déjà utilisé par une autre moto.';

function toErrorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('matricule')) return MATRICULE_DUPLIQUE;
  if (message.includes('permis')) return PERMIS_DUPLIQUE;
  return message || "Impossible d'enregistrer la moto";
}

@Component({
  selector: 'app-enregistrement-moto-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Field, FormError],
  templateUrl: './enregistrement-moto-modal.html',
})
export class EnregistrementMotoModal {
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly motosApi = inject(MotosApi);
  protected readonly contribuablesApi = inject(ContribuablesApi);
  protected readonly uploadApi = inject(UploadApi);
  readonly selectedYear = input.required<number>();

  readonly droitAdhesion = input.required<number>();

  readonly closed = output<void>();

  readonly saved = output<MotoPayment | undefined>();

  protected readonly error = signal('');

  protected readonly isSubmitting = signal(false);

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    this.error.set('');
    const form = (e.currentTarget as HTMLFormElement);
    if (!validateFormElement(form)) {
    return;
    }
    this.isSubmitting.set(true);
    try {
    const formData = new FormData(form);
    const field = (name: string) => (formData.get(name) as string) || '';
    const permis = field('permisConducteur');
    const { matriculeExists, permisExists } = await this.motosApi.validateMotoDuplicates(field('matricule'), permis);
    if (matriculeExists || permisExists) {
    this.error.set(matriculeExists ? MATRICULE_DUPLIQUE : PERMIS_DUPLIQUE);
    return;
    }
    const proprietaire = await this.contribuablesApi.ensureContribuableByIdentity({
    cni: field('cniProprietaire'),
    fullName: field('nomProprietaire'),
    telephone: field('telephoneProprietaire'),
    adresse: field('adresseProprietaire'),
    });
    let conducteurId = proprietaire.id;
    if (field('isSameDriver') !== 'on' && field('cniConducteur')) {
    try {
    const conducteur = await this.contribuablesApi.ensureContribuableByIdentity({
    cni: field('cniConducteur'),
    fullName: field('nomConducteur'),
    telephone: field('telephoneConducteur'),
    adresse: '',
    });
    conducteurId = conducteur.id;
    }
    catch {
    this.error.set("Impossible d'enregistrer le conducteur.");
    return;
    }
    }
    let photoUrl: string | undefined;
    const photo = formData.get('photo');
    if (photo instanceof File && photo.size > 0) {
    try {
    photoUrl = (await this.uploadApi.uploadImage(photo, 'motos')).url;
    }
    catch {
    this.error.set("Impossible d'uploader la photo.");
    return;
    }
    }
    const moto = await this.motosApi.createMoto({
    matricule: field('matricule'),
    marque: field('marque'),
    modele: field('modele'),
    annee: Number(field('annee')),
    couleur: field('couleur') || undefined,
    proprietaireId: proprietaire.id,
    conducteurId,
    permis: permis || undefined,
    photo: photoUrl,
    year: this.selectedYear(),
    });
    await this.saved.emit(moto.adhesion);
    }
    catch (err) {
    this.error.set(toErrorMessage(err));
    }
    finally {
    this.isSubmitting.set(false);
    }
    }
}
