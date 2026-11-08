import { useState } from 'react';
import Modal, { Field } from '../../../components/feature/Modal';
import ContribuableSelect, { requireSelectedContribuable } from '../../../components/feature/ContribuableSelect';
import { useToast } from '../../../components/feature/Toast';
import { getStoredUserName } from '../../../services/auth';
import { createTransaction } from '../../../services/taxes';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../../utils/formValidation';
import { INPUT_CLASS, formatDate, formatTime, type ReceiptData } from '../types';

type NouveauTicketModalProps = {
  onClose: () => void;
  /** Appelé après l'enregistrement, pour recharger la liste. */
  onSaved: () => Promise<void>;
  onPrint: (receipt: ReceiptData) => void;
};

const BUTTON_PRIMARY =
  'px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-60';
const BUTTON_SECONDARY = 'px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap';

export default function NouveauTicketModal({ onClose, onSaved, onPrint }: NouveauTicketModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!validateFormElement(form)) return;
    const contribuableId = requireSelectedContribuable(form, 'contributorId');
    if (!contribuableId) return;

    const data = new FormData(form);
    const type = String(data.get('type') || '').trim();
    const amount = Number(data.get('amount') || 0);
    const reference = `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    setSubmitting(true);
    try {
      const created = await createTransaction({
        contribuableId,
        categorie: type,
        type,
        service: type,
        quantite: 1,
        montant: amount,
        modePaiement: 'ESPECE',
        reference,
      });
      const now = new Date();
      // Libellé « Prénom Nom (NIN) » du sélecteur : le reçu ne garde que le nom.
      const label = String(data.get('contribuableRecherche') || '').replace(/\s*\([^)]*\)\s*$/, '');
      setReceipt({
        ticketNumber: created?.numero || reference,
        type,
        contributor: label || '-',
        amount,
        date: formatDate(now),
        time: formatTime(now),
        agent: getStoredUserName() || 'Agent Municipal',
      });
      await onSaved();
    } catch (error) {
      showToast(getErrorMessage(error, "Impossible d'enregistrer le ticket."), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <Modal title="Nouveau ticket de paiement" size="2xl" onClose={onClose}>
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-check-line text-3xl text-green-600"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ticket enregistré avec succès !</h3>
          <p className="text-sm text-gray-600 mb-6">
            Numéro de ticket : <strong>{receipt.ticketNumber}</strong>
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={onClose} className={BUTTON_SECONDARY}>
              Fermer
            </button>
            <button onClick={() => onPrint(receipt)} className={BUTTON_PRIMARY}>
              <i className="ri-printer-line"></i>
              Générer le reçu
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Nouveau ticket de paiement" size="2xl" onClose={onClose}>
      <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="space-y-4">
        <Field label="Type de taxe">
          <input name="type" data-required="true" className={INPUT_CLASS} placeholder="Ex: Ticket journalier" />
        </Field>
        <Field label="Contribuable">
          <ContribuableSelect name="contributorId" inputClassName={INPUT_CLASS} />
        </Field>
        <Field label="Montant (FCFA)">
          <input type="number" name="amount" data-required="true" min="1" className={INPUT_CLASS} />
        </Field>
        <div className="flex items-center justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className={BUTTON_SECONDARY}>
            Annuler
          </button>
          <button type="submit" disabled={submitting} className={BUTTON_PRIMARY}>
            <i className="ri-check-line"></i>
            {submitting ? 'Enregistrement...' : 'Enregistrer le ticket'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
