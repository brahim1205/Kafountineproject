import { useState } from 'react';
import { createMoto, validateMotoDuplicates } from '../../../services/motos';
import { ensureContribuableByIdentity } from '../../../services/contribuables';
import { uploadImage } from '../../../services/upload';
import { clearFieldValidationError, validateFormElement } from '../../../utils/formValidation';
import Field, { FormError, INPUT_CLASS } from './Field';

type EnregistrementMotoModalProps = {
  selectedYear: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

const MATRICULE_DUPLIQUE = 'Ce numéro de matricule est déjà utilisé par une autre moto.';
const PERMIS_DUPLIQUE = 'Ce numéro de permis de conduire est déjà utilisé par une autre moto.';

function toErrorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('matricule')) return MATRICULE_DUPLIQUE;
  if (message.includes('permis')) return PERMIS_DUPLIQUE;
  return message || "Impossible d'enregistrer la moto";
}

export default function EnregistrementMotoModal({ selectedYear, onClose, onSaved }: EnregistrementMotoModalProps) {
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
      const permis = field('permisConducteur');

      const { matriculeExists, permisExists } = await validateMotoDuplicates(field('matricule'), permis);
      if (matriculeExists || permisExists) {
        setError(matriculeExists ? MATRICULE_DUPLIQUE : PERMIS_DUPLIQUE);
        return;
      }

      const proprietaire = await ensureContribuableByIdentity({
        cni: field('cniProprietaire'),
        fullName: field('nomProprietaire'),
        telephone: field('telephoneProprietaire'),
        adresse: field('adresseProprietaire'),
      });

      let conducteurId = proprietaire.id;
      if (field('isSameDriver') !== 'on' && field('cniConducteur')) {
        try {
          const conducteur = await ensureContribuableByIdentity({
            cni: field('cniConducteur'),
            fullName: field('nomConducteur'),
            telephone: field('telephoneConducteur'),
            adresse: '',
          });
          conducteurId = conducteur.id;
        } catch {
          setError("Impossible d'enregistrer le conducteur.");
          return;
        }
      }

      let photoUrl: string | undefined;
      const photo = formData.get('photo');
      if (photo instanceof File && photo.size > 0) {
        try {
          photoUrl = (await uploadImage(photo, 'motos')).url;
        } catch {
          setError("Impossible d'uploader la photo.");
          return;
        }
      }

      await createMoto({
        matricule: field('matricule'),
        marque: field('marque'),
        modele: field('modele'),
        annee: Number(field('annee')),
        couleur: field('couleur'),
        proprietaireId: proprietaire.id,
        conducteurId,
        permis: permis || undefined,
        photo: photoUrl,
        year: selectedYear,
      });

      await onSaved();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Enregistrer une nouvelle moto</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <i className="ri-close-line text-xl text-gray-600"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="md:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <i className="ri-motorbike-line text-emerald-600"></i>
                Informations de la moto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Matricule" name="matricule" required placeholder="DK-1234-AB" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marque <span className="text-red-500">*</span></label>
                  <select name="marque" data-required="true" className={`${INPUT_CLASS} cursor-pointer`}>
                    <option value="">Sélectionner</option>
                    <option value="Honda">Honda</option>
                    <option value="Yamaha">Yamaha</option>
                    <option value="Suzuki">Suzuki</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <Field label="Modèle" name="modele" required placeholder="CG 125" />
                <Field label="Année" name="annee" type="number" required placeholder="2024" min={1900} max={selectedYear + 1} />
                <Field label="Couleur" name="couleur" required placeholder="Rouge" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                  <input type="file" name="photo" accept="image/*" className={`${INPUT_CLASS} cursor-pointer`} />
                </div>
              </div>
            </section>

            <section className="md:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <i className="ri-user-line text-emerald-600"></i>
                Informations du propriétaire
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nom complet" name="nomProprietaire" required placeholder="Mamadou Diallo" />
                <Field label="N° CNI" name="cniProprietaire" required placeholder="1234567890123" />
                <Field label="Téléphone" name="telephoneProprietaire" type="tel" required placeholder="77 123 45 67" />
                <Field label="Adresse" name="adresseProprietaire" placeholder="Quartier, Kafountine" />
              </div>
            </section>

            <section className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <i className="ri-steering-2-line text-emerald-600"></i>
                  Informations du conducteur
                </h3>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" name="isSameDriver" className="rounded cursor-pointer" />
                  Même que le propriétaire
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nom complet" name="nomConducteur" placeholder="Mamadou Diallo" />
                <Field label="N° CNI" name="cniConducteur" placeholder="1234567890123" />
                <Field label="Téléphone" name="telephoneConducteur" type="tel" placeholder="77 123 45 67" />
                <Field label="N° Permis" name="permisConducteur" placeholder="A-2024-12345" />
              </div>
            </section>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 text-white rounded-lg whitespace-nowrap cursor-pointer ${
                isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 transition-colors'
              }`}
            >
              <i className={`ri-${isSubmitting ? 'loader-4-line animate-spin' : 'check-line'} mr-2`}></i>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer la moto'}
            </button>
          </div>

          <FormError message={error} />
        </form>
      </div>
    </div>
  );
}
