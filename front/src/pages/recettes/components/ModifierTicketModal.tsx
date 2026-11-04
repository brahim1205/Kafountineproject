import { useState } from 'react';
import Modal, { Field } from '../../../components/feature/Modal';
import ContribuableSelect, { requireSelectedContribuable } from '../../../components/feature/ContribuableSelect';
import { useToast } from '../../../components/feature/Toast';
import { deleteTransaction, updateTransaction } from '../../../services/taxes';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../../utils/formValidation';
import { INPUT_CLASS, type RecetteRow } from '../types';

type ModifierTicketModalProps = {
  row: RecetteRow;
  onClose: () => void;
  /** Appelé après une modification ou une suppression réussie. */
  onSaved: () => Promise<void>;
};

export default function ModifierTicketModal({ row, onClose, onSaved }: ModifierTicketModalProps) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string, failure: string) => {
    setBusy(true);
    try {
      await action();
      showToast(success, 'success');
      await onSaved();
    } catch (error) {
      showToast(getErrorMessage(error, failure), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!validateFormElement(form)) return;
    const contribuableId = requireSelectedContribuable(form, 'contributorId');
    if (!contribuableId) return;
    const data = new FormData(form);
    run(
      () =>
        updateTransaction(row.id, {
          type: String(data.get('type') || '').trim(),
          contribuableId,
          montant: Number(data.get('amount') || 0),
        }),
      'Ticket mis à jour avec succès.',
      'Erreur lors de la mise à jour.'
    );
  };

  const handleDelete = () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction définitivement ? Cette action est irréversible.')) return;
    run(() => deleteTransaction(row.id), 'Transaction supprimée avec succès.', 'Erreur lors de la suppression.');
  };

  const initial = row.contribuableId
    ? { id: row.contribuableId, label: row.contribuableNin ? `${row.contributor} (${row.contribuableNin})` : row.contributor }
    : undefined;

  return (
    <Modal title={`Modifier la transaction ${row.ticketNumber}`} size="2xl" onClose={onClose}>
      <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="space-y-4">
        <Field label="Type de taxe">
          <input name="type" data-required="true" defaultValue={row.type} className={INPUT_CLASS} />
        </Field>
        <Field label="Contribuable">
          <ContribuableSelect name="contributorId" initial={initial} inputClassName={INPUT_CLASS} />
        </Field>
        <Field label="Montant (FCFA)">
          <input type="number" name="amount" data-required="true" min="0" defaultValue={row.amount} className={INPUT_CLASS} />
        </Field>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <i className="ri-delete-bin-line"></i>
            Supprimer la recette
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <i className="ri-save-line"></i>
              Enregistrer
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
