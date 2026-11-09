import { ChangeDetectionStrategy, Component, input, output, signal, linkedSignal, effect, untracked } from '@angular/core';
import { FormationType } from '../page';
import { clearFieldValidationError, validateFormElement } from '../../../utils/form-validation';

@Component({
  selector: 'app-formation-card',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './formation-card.html',
})
export class FormationCard {
  protected readonly clearFieldValidationError = clearFieldValidationError;

  readonly formation = input.required<FormationType>();

  readonly jeunesCount = input.required<number>();

  readonly inscrireJeune = output<void>();

  readonly voirDetail = output<void>();

  readonly edit = output<FormationType>();

  readonly delete = output<string>();

  protected readonly showMenu = signal(false);

  protected readonly showEdit = signal(false);

  protected readonly showDeleteConfirm = signal(false);

  protected readonly editData = linkedSignal(() => ({ ...this.formation() }));

  protected readonly errorMsg = signal('');

  protected menuRef = { current: null as HTMLElement | null };

  protected formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    });
    }

  protected formatMontant(montant: number) {
    return new Intl.NumberFormat('fr-FR').format(montant);
  }

  protected handleEditSubmit(e: Event) {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    return;
    }
    try {
    this.errorMsg.set('');
    this.edit.emit(this.editData());
    this.showEdit.set(false);
    }
    catch {
    this.errorMsg.set("Impossible d'enregistrer la formation.");
    }
    }

  protected editDataSummary() {
    return this.editData.set({ ...this.formation() });
  }

  protected onNomChange(e: Event) {
    return this.editData.set({ ...this.editData(), nom: (e.target as HTMLInputElement).value });
  }

  protected onDomaineChange(e: Event) {
    return this.editData.set({ ...this.editData(), domaine: (e.target as HTMLInputElement).value });
  }

  protected onDureeChange(e: Event) {
    return this.editData.set({ ...this.editData(), duree: (e.target as HTMLInputElement).value });
  }

  protected onResponsableChange(e: Event) {
    return this.editData.set({
    ...this.editData(),
    responsable: (e.target as HTMLInputElement).value,
    });
  }

  protected onBudgetChange(e: Event) {
    return this.editData.set({
    ...this.editData(),
    budget: Number((e.target as HTMLInputElement).value),
    });
  }

  protected onDateDebutChange(e: Event) {
    return this.editData.set({ ...this.editData(), dateDebut: (e.target as HTMLInputElement).value });
  }

  protected onDateFinChange(e: Event) {
    return this.editData.set({ ...this.editData(), dateFin: (e.target as HTMLInputElement).value });
  }

  protected onStatutChange(e: Event) {
    return this.editData.set({ ...this.editData(), statut: (e.target as HTMLInputElement).value });
  }

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      this.showMenu();
      const cleanup = untracked(() => (() => {
    const handleClickOutside = (e: MouseEvent) => {
    if (this.menuRef.current && !this.menuRef.current.contains(e.target as Node)) {
    this.showMenu.set(false);
    }
    };
    if (this.showMenu()) {
    document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
    document.removeEventListener('mousedown', handleClickOutside);
    };
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
