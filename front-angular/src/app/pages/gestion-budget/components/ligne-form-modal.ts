import { ChangeDetectionStrategy, Component, input, output, signal, linkedSignal, computed } from '@angular/core';
import { Modal } from '../../../components/feature/modal';
import { Field } from '../../../components/feature/field';
import { FooterButtons } from '../../../components/feature/footer-buttons';
import { LigneBudgetaire, LigneBudgetairePayload } from '../../../services/budget';

const INPUT_CLASS = 'w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

@Component({
  selector: 'app-ligne-form-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, FooterButtons, Field],
  templateUrl: './ligne-form-modal.html',
})
export class LigneFormModal {
  protected readonly INPUT_CLASS = INPUT_CLASS;

  readonly ligne = input<LigneBudgetaire | undefined>(undefined);

  readonly closed = output<void>();

  readonly submitted = output<LigneBudgetairePayload>();

  protected readonly isEdit = computed(() => Boolean(this.ligne()));

  protected readonly form = linkedSignal(() => ({
    code: this.ligne()?.code ?? '',
    libelle: this.ligne()?.libelle ?? '',
    description: this.ligne()?.description ?? '',
    prevu: this.ligne() ? String(this.ligne()!.prevu) : '',
    depense: this.ligne() ? String(this.ligne()!.depense) : '',
    }));

  protected readonly error = signal<string | null>(null);

  protected readonly saving = signal(false);

  protected set(key: string) {
    return (e: Event) => this.form.update((current) => ({ ...current, [key]: (e.target as HTMLInputElement).value }));
  }

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    this.error.set(null);
    if (!this.form().code.trim() || !this.form().libelle.trim() || !this.form().prevu.trim()) {
    this.error.set('Le code, le libellé et le montant budgétisé sont requis.');
    return;
    }
    if (Number(this.form().prevu) < 0 || Number(this.form().depense || '0') < 0) {
    this.error.set(this.isEdit() ? 'Les montants doivent être positifs.' : 'Le montant budgétisé doit être positif.');
    return;
    }
    try {
    this.saving.set(true);
    await this.submitted.emit({
    code: this.form().code.trim(),
    libelle: this.form().libelle.trim(),
    description: this.form().description.trim() || null,
    prevu: Number(this.form().prevu),
    ...(this.isEdit() ? { depense: Number(this.form().depense || '0') } : {}),
    });
    }
    catch (err) {
    this.error.set(err instanceof Error ? err.message : this.isEdit() ? 'Mise à jour impossible.' : 'Création impossible.');
    }
    finally {
    this.saving.set(false);
    }
    }
}
