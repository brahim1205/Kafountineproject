import { useState } from 'react';
import { updateMoto } from '../../../services/motos';
import { ensureContribuableByIdentity } from '../../../services/contribuables';
import { clearFieldValidationError, validateFormElement } from '../../../utils/formValidation';
import type { UiMoto } from '../types';
import Field, { FormError, INPUT_CLASS } from './Field';

type ChangementMotoModalProps = {
  moto: UiMoto;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

const TYPES_CHANGEMENT = [
  { value: 'proprietaire', titre: 'Propriétaire', description: 'Transfert de propriété' },
  { value: 'conducteur', titre: 'Conducteur', description: 'Changement de conducteur' },
];

export default function ChangementMotoModal({ moto, onClose, onSaved }: ChangementMotoModalProps) {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const form = e.currentTarget;
    if (!validateFormElement(form)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData(form);
      const field = (name: string) => (formData.get(name) as string) || '';

      const nouvellePersonne = await ensureContribuableByIdentity({
        cni: field('nouveauCNI'),
        fullName: field('nouveauNom'),
        telephone: field('nouveauTelephone'),
        adresse: field('nouvelleAdresse'),
      });

      if ((field('typeChangement') || 'proprietaire') === 'proprietaire') {
        await updateMoto(moto.id, { proprietaireId: nouvellePersonne.id });
      } else {
        await updateMoto(moto.id, { conducteurId: nouvellePersonne.id, permis: field('nouveauPermis') });
      }

      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le changement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Déclaration de changement</h2>
            <p className="text-sm text-gray-600 mt-1">{moto.matricule}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <i className="ri-close-line text-xl text-gray-600"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de changement</label>
            <div className="grid grid-cols-2 gap-3">
              {TYPES_CHANGEMENT.map((type) => (
                <label
                  key={type.value}
                  className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <input
                    type="radio"
                    name="typeChangement"
                    value={type.value}
                    defaultChecked={type.value === 'proprietaire'}
                    className="cursor-pointer"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{type.titre}</p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Informations actuelles</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {([
                ['Propriétaire', moto.proprietaire],
                ['Conducteur', moto.conducteur],
              ] as const).map(([label, personne]) => (
                <div key={label}>
                  <p className="text-gray-600">{label}</p>
                  <p className="font-medium text-gray-900">{personne.nom}</p>
                  <p className="text-gray-500 text-xs">{personne.cni}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Nouvelles informations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nom complet" name="nouveauNom" required placeholder="Nouveau nom" />
              <Field label="N° CNI" name="nouveauCNI" required placeholder="1234567890123" />
              <Field label="Téléphone" name="nouveauTelephone" type="tel" required placeholder="77 123 45 67" />
              <Field label="N° Permis" name="nouveauPermis" placeholder="A-2024-12345" />
              <Field label="Adresse" name="nouvelleAdresse" placeholder="Quartier, Kafountine" className="md:col-span-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif du changement</label>
            <textarea rows={3} placeholder="Précisez le motif..." className={`${INPUT_CLASS} resize-none`}></textarea>
          </div>

          <FormError message={error} />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer le changement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
