import { useState } from 'react';
import { createTarif, updateTarif, type Tarif } from '../../../services/settings';
import { clearFieldValidationError, validateFormElement } from '../../../utils/formValidation';
import { INPUT_CLASS, Label, Modal, ModalActions } from './ui';

const UNITES = [
  'par acte', 'par jour', 'par mois', 'par an', 'par permis', 'par cérémonie', 'par m²', 'par m²/an', 'par dossier',
  'par parcelle', 'par opération', 'par unité', 'par unité/jour', 'par chargement', 'par passage', 'par séance',
  'par tête', 'par voyage', 'par pompe/mois', 'par infraction', 'par colis', 'par saison', 'par an ou par jour',
  'aller-retour', 'forfait', 'unique', 'autre',
];

type TarifModalProps = {
  /** Tarif à modifier ; absent pour une création. */
  tarif?: Tarif;
  categories: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
};

export default function TarifModal({ tarif, categories, onClose, onSaved, onError }: TarifModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const unites = tarif && !UNITES.includes(tarif.unite) ? [tarif.unite, ...UNITES] : UNITES;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget)) {
      return;
    }
    const formData = new FormData(e.currentTarget);
    const values = {
      categorie: formData.get('categorie') as string,
      nom: formData.get('nom') as string,
      montant: Number(formData.get('montant')),
      unite: formData.get('unite') as string,
      description: (formData.get('description') as string) || undefined,
      actif: formData.get('actif') === 'on',
    };

    setSubmitting(true);
    try {
      if (tarif) {
        await updateTarif(tarif.id, values);
        onSaved('Tarif modifié avec succès !');
      } else {
        await createTarif(values);
        onSaved('Tarif créé avec succès !');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Impossible d’enregistrer le tarif.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      wide
      onClose={onClose}
      title={
        <>
          <i className="ri-price-tag-3-line mr-2 text-emerald-600"></i>
          {tarif ? 'Modifier le tarif' : 'Nouveau tarif municipal'}
        </>
      }
    >
      <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="space-y-4">
        <div>
          <Label required>Catégorie</Label>
          <input
            name="categorie"
            list="tarif-categories"
            data-required="true"
            defaultValue={tarif?.categorie}
            placeholder="Ex: État civil, Urbanisme, Marché..."
            className={INPUT_CLASS}
          />
          <datalist id="tarif-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-gray-500">Sélectionnez une catégorie existante ou créez-en une nouvelle</p>
        </div>
        <div>
          <Label required>Libellé précis</Label>
          <input
            name="nom"
            data-required="true"
            defaultValue={tarif?.nom}
            placeholder="Ex: Bulletin de naissance, Permis de construire..."
            className={INPUT_CLASS}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Montant (FCFA)</Label>
            <div className="relative">
              <input
                name="montant"
                type="number"
                min="0"
                step="1"
                data-required="true"
                defaultValue={tarif?.montant}
                placeholder="0"
                className={`${INPUT_CLASS} pr-12`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">FCFA</span>
            </div>
          </div>
          <div>
            <Label required>Unité</Label>
            <select name="unite" data-required="true" defaultValue={tarif?.unite || ''} className={INPUT_CLASS}>
              <option value="">Sélectionner...</option>
              {unites.map((unite) => (
                <option key={unite} value={unite}>{unite}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label>Description (optionnel)</Label>
          <textarea
            name="description"
            defaultValue={tarif?.description}
            placeholder="Description détaillée du tarif..."
            className={INPUT_CLASS}
            rows={3}
          ></textarea>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="actif"
            defaultChecked={tarif ? tarif.actif : true}
            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
          />
          Tarif actif
        </label>
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel="Enregistrer le tarif" />
      </form>
    </Modal>
  );
}
