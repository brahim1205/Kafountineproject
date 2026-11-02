import { useState } from 'react';
import { createPenalite, updatePenalite, type Penalite } from '../../../services/settings';
import { clearFieldValidationError, validateFormElement } from '../../../utils/formValidation';
import { INPUT_CLASS, Label, Modal, ModalActions } from './ui';

type PenaliteModalProps = {
  /** Pénalité à modifier ; absente pour une création. */
  penalite?: Penalite;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
};

export default function PenaliteModal({ penalite, onClose, onSaved, onError }: PenaliteModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget)) {
      return;
    }
    const formData = new FormData(e.currentTarget);
    const values = {
      type: formData.get('type') as string,
      montant: Number(formData.get('montant')),
      delai: formData.get('delai') as string,
      description: (formData.get('description') as string) || undefined,
    };

    setSubmitting(true);
    try {
      if (penalite) {
        await updatePenalite(penalite.id, values);
        onSaved('Pénalité modifiée avec succès !');
      } else {
        await createPenalite(values);
        onSaved('Pénalité créée avec succès !');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Impossible d’enregistrer la pénalité.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={penalite ? 'Modifier la pénalité' : 'Nouvelle pénalité'} onClose={onClose}>
      <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="space-y-4">
        <div>
          <Label required>Type</Label>
          <input name="type" data-required="true" defaultValue={penalite?.type} className={INPUT_CLASS} />
        </div>
        <div>
          <Label required>Montant (FCFA)</Label>
          <input name="montant" type="number" min="0" data-required="true" defaultValue={penalite?.montant} className={INPUT_CLASS} />
        </div>
        <div>
          <Label required>Délai d'application</Label>
          <input
            name="delai"
            data-required="true"
            defaultValue={penalite?.delai}
            placeholder="Ex: 5 jours après échéance"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <Label>Description</Label>
          <textarea name="description" defaultValue={penalite?.description} className={INPUT_CLASS} rows={2}></textarea>
        </div>
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel={penalite ? 'Enregistrer' : 'Créer'} />
      </form>
    </Modal>
  );
}
