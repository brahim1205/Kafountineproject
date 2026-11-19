import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { clearFieldValidationError, validateFormElement } from '../../../utils/form-validation';
import { UiMoto } from '../types';
import { Field, INPUT_CLASS } from './field';
import { FormError } from './form-error';
import { ContribuablesApi } from '../../../services/contribuables';
import { ChangementMoto, MotosApi } from '../../../services/motos';

const TYPES_CHANGEMENT = [
  { value: 'proprietaire', titre: 'Propriétaire', description: 'Transfert de propriété' },
  { value: 'conducteur', titre: 'Conducteur', description: 'Changement de conducteur' },
];

@Component({
  selector: 'app-changement-moto-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Field, FormError],
  templateUrl: './changement-moto-modal.html',
})
export class ChangementMotoModal implements OnInit {
  protected readonly TYPES_CHANGEMENT = TYPES_CHANGEMENT;
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly contribuablesApi = inject(ContribuablesApi);
  protected readonly motosApi = inject(MotosApi);
  readonly moto = input.required<UiMoto>();

  readonly closed = output<void>();

  readonly saved = output<void>();

  /** Propriétaire : la CNI est exigée (titulaire de la moto). Conducteur : c'est le permis qui compte. */
  protected readonly typeChangement = signal<string>('proprietaire');

  protected readonly error = signal('');

  protected readonly isSubmitting = signal(false);

  protected readonly historique = signal<ChangementMoto[]>([]);

  protected readonly historiqueErreur = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.historique.set(await this.motosApi.getHistorique(this.moto().id));
    } catch (err) {
      this.historiqueErreur.set(err instanceof Error ? err.message : "L'historique n'a pas pu être chargé.");
    }
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

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
    const nouvellePersonne = await this.contribuablesApi.ensureContribuableByIdentity({
    cni: field('nouveauCNI'),
    fullName: field('nouveauNom'),
    telephone: field('nouveauTelephone'),
    adresse: field('nouvelleAdresse'),
    });
    const type = field('typeChangement') === 'conducteur' ? 'conducteur' : 'proprietaire';
    await this.motosApi.declarerChangement(this.moto().id, {
    type,
    personneId: nouvellePersonne.id,
    permis: type === 'conducteur' ? field('nouveauPermis') || undefined : undefined,
    motif: field('motif').trim(),
    });
    await this.saved.emit();
    }
    catch (err) {
    this.error.set(err instanceof Error ? err.message : "Impossible d'enregistrer le changement");
    }
    finally {
    this.isSubmitting.set(false);
    }
    }

  protected motoSummary() {
    return ([
    ['Propriétaire', this.moto().proprietaire],
    ['Conducteur', this.moto().conducteur],
    ] as const);
  }
}
