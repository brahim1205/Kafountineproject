import { useState } from 'react';
import { createExpedition, type CamionFrigorifique } from '../../../../services/quai-peche';
import { clearFieldValidationError, validateFormElement } from '../../../../utils/formValidation';
import { INPUT_CLASS } from './statuts';
import Modal, { Field, FooterButtons } from './Modal';

type ExpeditionModalProps = {
  camionsActifs: CamionFrigorifique[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function ExpeditionModal({ camionsActifs, onClose, onSaved }: ExpeditionModalProps) {
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
      await createExpedition({
        camionId: field('camionId') as string,
        poids: Number(field('poids')),
        destination: field('destination'),
        montant: field('montant') ? Number(field('montant')) : undefined,
        observations: field('observations'),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer l'expédition.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Nouvelle expédition" onClose={onClose} footer={<FooterButtons onCancel={onClose} form="form-expedition" submitting={submitting} />}>
      <form id="form-expedition" onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="space-y-4">
        <Field label="Camion" required>
          <select name="camionId" data-required="true" className={INPUT_CLASS}>
            <option value="">{camionsActifs.length ? 'Sélectionner un camion' : 'Aucun camion actif'}</option>
            {camionsActifs.map((camion) => (
              <option key={camion.id} value={camion.id}>
                {camion.immatriculation} — {camion.marque}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Poids (kg)" required>
            <input name="poids" type="number" min="0.1" step="0.1" data-required="true" placeholder="Ex: 1500" className={INPUT_CLASS} />
          </Field>
          <Field label="Montant (FCFA)">
            <input name="montant" type="number" min="0" placeholder="Ex: 25000" className={INPUT_CLASS} />
          </Field>
        </div>
        <Field label="Destination">
          <input name="destination" placeholder="Ville de destination" className={INPUT_CLASS} />
        </Field>
        <Field label="Observations">
          <textarea name="observations" rows={3} placeholder="Observations..." className={`${INPUT_CLASS} resize-none`}></textarea>
        </Field>
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      </form>
    </Modal>
  );
}
