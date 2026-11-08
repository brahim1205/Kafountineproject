import MotoPhoto from './MotoPhoto';
import { useState } from 'react';
import { createMotoPayment } from '../../../services/motos';
import { useToast } from '../../../components/feature/Toast';
import { getErrorMessage } from '../../../utils/formValidation';
import { FULL_DATE, SHORT_TIME, libellePaiement, montantDu, type MotoConfig, type ReceiptData, type UiMoto } from '../types';
import { INPUT_CLASS } from './Field';

type PaiementMotoModalProps = {
  moto: UiMoto;
  motoConfig: MotoConfig;
  onClose: () => void;
  onPaid: (receipt: ReceiptData) => Promise<void>;
};

export default function PaiementMotoModal({ moto, motoConfig, onClose, onPaid }: PaiementMotoModalProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<'COTISATION' | 'AMENDE_POLICE'>('COTISATION');
  const now = new Date();
  const amende = type === 'AMENDE_POLICE';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const reference = String(new FormData(e.currentTarget).get('reference') || '').trim();

    try {
      // Le montant est calculé par le serveur selon le type de paiement.
      const payment = await createMotoPayment({ motoId: moto.id, type, reference: reference || undefined });
      await onPaid({
        // Numéro de reçu attribué par le serveur, à la suite des précédents.
        numero: payment.numeroRecu || '',
        date: now.toLocaleDateString('fr-FR', FULL_DATE),
        heure: now.toLocaleTimeString('fr-FR', SHORT_TIME),
        contribuable: moto.proprietaire.nom,
        type: libellePaiement({ type, mois: payment.mois, matricule: moto.matricule }) + (!amende && moto.enRetard ? ' (avec pénalité)' : ''),
        montant: payment.montant,
        agent: payment.agent || 'Agent Municipal',
      });
    } catch (error) {
      showToast(getErrorMessage(error, "Impossible d'enregistrer le paiement."), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="bg-emerald-600 text-white px-6 py-4 rounded-t-xl">
          <h2 className="text-xl font-bold">Enregistrer un paiement</h2>
          <p className="text-sm text-emerald-100 mt-1">{moto.matricule}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <MotoPhoto src={moto.photo} alt={moto.matricule} sizeClass="w-20 h-16" />
              <div>
                <p className="font-semibold text-gray-900">{moto.marque} {moto.modele}</p>
                <p className="text-sm text-gray-600">{moto.proprietaire.nom}</p>
              </div>
            </div>

            {amende ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800">
                  <i className="ri-police-car-line mr-1"></i>
                  Moto arrêtée par la police
                </p>
                <p className="text-sm font-bold text-amber-800 mt-1">Amende : {motoConfig.amendePolice.toLocaleString()} FCFA</p>
              </div>
            ) : moto.enRetard ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 mb-1">
                  <i className="ri-error-warning-line mr-1"></i>
                  Paiement en retard de {moto.joursRetard} jours
                </p>
                <div className="text-sm text-red-700">
                  <p>Taxe mensuelle: {motoConfig.tarifMensuel.toLocaleString()} FCFA</p>
                  <p>Pénalité: {moto.montantPenalite.toLocaleString()} FCFA</p>
                  <p className="font-bold mt-1">Total à payer: {montantDu(moto, motoConfig).toLocaleString()} FCFA</p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-sm font-medium text-emerald-800">
                  <i className="ri-checkbox-circle-line mr-1"></i>
                  Paiement à jour
                </p>
                <p className="text-sm text-emerald-700 mt-1">Montant: {motoConfig.tarifMensuel.toLocaleString()} FCFA</p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="type-paiement" className="block text-sm font-medium text-gray-700 mb-1">Type de paiement</label>
            <select
              id="type-paiement"
              value={type}
              onChange={(e) => setType(e.target.value as 'COTISATION' | 'AMENDE_POLICE')}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="COTISATION">Cotisation mensuelle</option>
              <option value="AMENDE_POLICE">Amende police</option>
            </select>
          </div>

          {amende && (
            <div>
              <label htmlFor="reference-amende" className="block text-sm font-medium text-gray-700 mb-1">N° du procès-verbal (facultatif)</label>
              <input id="reference-amende" name="reference" maxLength={120} className={INPUT_CLASS} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
            <select name="modePaiement" className={`${INPUT_CLASS} cursor-pointer`}>
              <option>Espèces</option>
              <option>Mobile Money</option>
              <option>Chèque</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
            <textarea name="observations" rows={3} placeholder="Remarques éventuelles..." className={`${INPUT_CLASS} resize-none`}></textarea>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
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
              {isSubmitting ? 'Validation...' : 'Valider le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
