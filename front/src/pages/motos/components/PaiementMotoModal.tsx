import { useState } from 'react';
import { createMotoPayment } from '../../../services/motos';
import { useToast } from '../../../components/feature/Toast';
import { getErrorMessage } from '../../../utils/formValidation';
import { FULL_DATE, SHORT_TIME, montantDu, type MotoConfig, type ReceiptData, type UiMoto } from '../types';
import { INPUT_CLASS } from './Field';

type PaiementMotoModalProps = {
  moto: UiMoto;
  motoConfig: MotoConfig;
  selectedYear: number;
  onClose: () => void;
  onPaid: (receipt: ReceiptData) => Promise<void>;
};

function moisDeLAnnee(year: number) {
  return Array.from({ length: 12 }, (_, month) => {
    const label = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });
}

export default function PaiementMotoModal({ moto, motoConfig, selectedYear, onClose, onPaid }: PaiementMotoModalProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mois = moisDeLAnnee(selectedYear);
  const now = new Date();
  const moisParDefaut = mois[now.getFullYear() === selectedYear ? now.getMonth() : 0];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const moisPaiement = new FormData(e.currentTarget).get('mois') as string;
    const numeroRecu = `MOTO-${now.getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`;

    try {
      // Le montant est calculé par le serveur (tarif mensuel + pénalité éventuelle).
      const payment = await createMotoPayment({ motoId: moto.id, reference: numeroRecu, mois: moisPaiement });
      await onPaid({
        numero: numeroRecu,
        date: now.toLocaleDateString('fr-FR', FULL_DATE),
        heure: now.toLocaleTimeString('fr-FR', SHORT_TIME),
        contribuable: moto.proprietaire.nom,
        type: `Taxe moto Jakarta ${moto.matricule} - ${moisPaiement}${moto.enRetard ? ' (avec pénalité)' : ''}`,
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
              {moto.photo && <img src={moto.photo} alt={moto.matricule} className="w-20 h-16 object-cover rounded-lg" />}
              <div>
                <p className="font-semibold text-gray-900">{moto.marque} {moto.modele}</p>
                <p className="text-sm text-gray-600">{moto.proprietaire.nom}</p>
              </div>
            </div>

            {moto.enRetard ? (
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Mois de paiement</label>
            <select name="mois" defaultValue={moisParDefaut} className={`${INPUT_CLASS} cursor-pointer`}>
              {mois.map((label) => (
                <option key={label}>{label}</option>
              ))}
            </select>
          </div>

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
