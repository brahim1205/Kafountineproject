import { useState } from 'react';
import { createCamion } from '../../../../services/quai-peche';
import { clearFieldValidationError, validateFormElement } from '../../../../utils/formValidation';
import { INPUT_CLASS } from './statuts';
import Modal, { Field, FooterButtons } from '../../../../components/feature/Modal';

type CamionModalProps = {
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function CamionModal({ onClose, onSaved }: CamionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget)) return;
    const data = new FormData(e.currentTarget);
    const field = (name: string) => ((data.get(name) as string) || '').trim() || undefined;

    setSubmitting(true);
    setError('');
    try {
      await createCamion({
        immatriculation: field('immatriculation') as string,
        marque: field('marque') as string,
        modele: field('modele'),
        capacite: field('capacite') ? Number(field('capacite')) : undefined,
        chauffeur: field('chauffeur'),
        telephone: field('telephone'),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le camion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Nouveau camion frigorifique" onClose={onClose} footer={<FooterButtons onCancel={onClose} form="form-camion" submitting={submitting} />}>
      <form id="form-camion" onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Immatriculation" required>
            <input name="immatriculation" data-required="true" placeholder="Ex: DK 1234 A" className={INPUT_CLASS} />
          </Field>
          <Field label="Marque" required>
            <input name="marque" data-required="true" placeholder="Ex: Renault" className={INPUT_CLASS} />
          </Field>
          <Field label="Modèle">
            <input name="modele" placeholder="Ex: Master" className={INPUT_CLASS} />
          </Field>
          <Field label="Capacité (kg)">
            <input name="capacite" type="number" min="0" placeholder="Ex: 5000" className={INPUT_CLASS} />
          </Field>
          <Field label="Chauffeur">
            <input name="chauffeur" placeholder="Nom du chauffeur" className={INPUT_CLASS} />
          </Field>
          <Field label="Téléphone">
            <input name="telephone" type="tel" placeholder="Ex: 77 123 45 67" className={INPUT_CLASS} />
          </Field>
        </div>
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      </form>
    </Modal>
  );
}
