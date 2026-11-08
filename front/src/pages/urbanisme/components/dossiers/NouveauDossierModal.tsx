import { useState, type ReactNode } from 'react';
import { createDossierUrbanisme, type DossierUrbanisme } from '../../../../services/urbanisme';
import { ensureContribuableByIdentity } from '../../../../services/contribuables';
import type { TaxService } from '../../../../services/taxes';
import { clearFieldValidationError, validateFormElement } from '../../../../utils/formValidation';
import { NATURES, montantPermis } from './dossiers';

type NouveauDossierModalProps = {
  types: TaxService[];
  onClose: () => void;
  onCreated: (dossier: DossierUrbanisme) => Promise<void>;
};

const INPUT_CLASS =
  'w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 transition-all';

function Field({ label, icon, required, wide, children }: { label: string; icon: string; required?: boolean; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'md:col-span-2' : undefined}>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <i className={`${icon} absolute left-4 top-1/2 -translate-y-1/2 text-gray-400`}></i>
        {children}
      </div>
    </div>
  );
}

export default function NouveauDossierModal({ types, onClose, onCreated }: NouveauDossierModalProps) {
  const [typeId, setTypeId] = useState('');
  const [surface, setSurface] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const permis = types.find((type) => type.id === typeId);
  const auMetreCarre = permis?.unite === 'm²';
  const surfaceSaisie = auMetreCarre ? Number.parseInt(surface, 10) || undefined : undefined;
  const montant = permis ? montantPermis(permis, surfaceSaisie) : 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!validateFormElement(e.currentTarget) || !permis) {
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData(e.currentTarget);
      const field = (name: string) => ((data.get(name) as string) || '').trim();
      const contribuable = await ensureContribuableByIdentity({
        cni: field('cni'),
        fullName: field('nomComplet'),
        telephone: field('telephone'),
        adresse: field('localisation'),
      });
      const dossier = await createDossierUrbanisme({
        contribuableId: contribuable.id,
        type: permis.id,
        description: field('description'),
        surface: surfaceSaisie,
        localisation: field('localisation'),
        nature: field('nature'),
        montant,
      });
      await onCreated(dossier);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le dossier");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-5 flex items-center justify-between z-10">
          <div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Nouveau dossier d'urbanisme</h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Enregistrement officiel - Commune de Kafountine</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Type de permis / Autorisation" icon="ri-file-list-3-line" required wide>
              <select
                name="type"
                data-required="true"
                value={typeId}
                onChange={(e) => {
                  setTypeId(e.target.value);
                  setSurface('');
                }}
                className={`${INPUT_CLASS} appearance-none`}
              >
                <option value="">{types.length ? 'Sélectionnez un type' : 'Tarifs indisponibles'}</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{type.nom}</option>
                ))}
              </select>
            </Field>
            <Field label="Nom complet du demandeur" icon="ri-user-line" required>
              <input name="nomComplet" data-required="true" placeholder="Ex: El Hadji Malick Sy" className={INPUT_CLASS} />
            </Field>
            <Field label="Numéro CNI / NIN" icon="ri-id-card-line" required>
              <input name="cni" data-required="true" placeholder="Ex: 1755198000123" className={INPUT_CLASS} />
            </Field>
            <Field label="Numéro de téléphone" icon="ri-phone-line" required>
              <input type="tel" name="telephone" data-required="true" placeholder="Ex: 771234567" className={INPUT_CLASS} />
            </Field>
            <Field label="Localisation précise du projet" icon="ri-map-pin-line" required wide>
              <input name="localisation" data-required="true" placeholder="Ex: Quartier Abéné, Parcelle n°45" className={INPUT_CLASS} />
            </Field>
            {auMetreCarre && (
              <Field label="Surface totale (m²)" icon="ri-ruler-2-line" required>
                <input
                  type="number"
                  name="surface"
                  min="1"
                  data-required="true"
                  value={surface}
                  onChange={(e) => setSurface(e.target.value)}
                  placeholder="Ex: 250"
                  className={INPUT_CLASS}
                />
              </Field>
            )}
            <Field label="Nature du projet" icon="ri-building-line" required wide={!auMetreCarre}>
              <select name="nature" data-required="true" className={`${INPUT_CLASS} appearance-none`}>
                <option value="">Sélectionnez la nature</option>
                {Object.entries(NATURES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Description complémentaire</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Précisez les détails du projet (ex: nombre d'étages, type de clôture...)"
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
              ></textarea>
            </div>
          </div>

          {permis && (
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
              <div className="relative flex justify-between items-center text-white">
                <div>
                  <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">Estimation des droits</p>
                  <h4 className="text-sm font-bold mb-2">{permis.nom}</h4>
                  <p className="text-emerald-50/70 text-[10px] font-medium">
                    Tarif : {permis.tarif.toLocaleString('fr-FR')} F / {permis.unite}
                    {auMetreCarre && ` · Base de calcul : ${Math.max(1, surfaceSaisie || 1)} m²`}
                  </p>
                </div>
                <p className="text-3xl font-black">
                  {montant.toLocaleString('fr-FR')} <span className="text-xs opacity-60">FCFA</span>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-600">
              <i className="ri-error-warning-line text-xl"></i>
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-8 py-4 bg-gray-100 text-gray-500 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-[2] px-8 py-4 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-3 ${
                submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-xl'
              }`}
            >
              <i className={`${submitting ? 'ri-loader-4-line animate-spin' : 'ri-checkbox-circle-line'} text-xl`}></i>
              {submitting ? 'Enregistrement...' : 'Créer le dossier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
