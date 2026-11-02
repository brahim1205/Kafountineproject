import { formatDate, type MotoConfig, type UiMoto } from '../types';
import { downloadCsv, today } from '../../../utils/csv';

type MotosEnRetardProps = {
  motos: UiMoto[];
  motoConfig: MotoConfig;
  canManage: boolean;
  onPaiement: (moto: UiMoto) => void;
};

function exportCsv(motos: UiMoto[]) {
  downloadCsv(`motos-retard-${today()}.csv`, [
    ['Matricule', 'Marque', 'Modèle', 'Propriétaire', 'Téléphone', 'Jours de retard', 'Montant pénalité', 'Dernier paiement'],
    ...motos.map((m) => [
      m.matricule,
      m.marque,
      m.modele,
      m.proprietaire?.nom,
      m.proprietaire?.telephone,
      m.joursRetard,
      m.montantPenalite,
      m.dernierPaiement ? new Date(m.dernierPaiement).toLocaleDateString('fr-FR') : 'Aucun',
    ]),
  ]);
}

export default function MotosEnRetard({ motos, motoConfig, canManage, onPaiement }: MotosEnRetardProps) {
  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => exportCsv(motos)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="ri-download-line"></i>
            Télécharger la liste
          </button>
        </div>
      )}
      {motos.map((moto) => (
        <div key={moto.id} className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex gap-4">
              <img src={moto.photo} alt={`${moto.marque} ${moto.modele}`} className="w-24 h-20 object-cover rounded-lg" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{moto.matricule}</h3>
                <p className="text-sm text-gray-600 mb-2">{moto.marque} {moto.modele}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <i className="ri-user-line text-base"></i>
                    <span>{moto.proprietaire.nom}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <i className="ri-phone-line text-base"></i>
                    <span>{moto.proprietaire.telephone}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded whitespace-nowrap inline-block mb-2">
                {moto.joursRetard} jours de retard
              </span>
              <p className="text-sm text-gray-600">Dernier paiement</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(moto.dernierPaiement, 'Aucun')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-red-200">
            <div>
              <p className="text-sm text-gray-600">Montant à payer (avec pénalité)</p>
              <p className="text-xl font-bold text-red-600">{(motoConfig.tarifMensuel + moto.montantPenalite).toLocaleString()} FCFA</p>
              <p className="text-xs text-gray-500">
                Taxe: {motoConfig.tarifMensuel.toLocaleString()} FCFA + Pénalité: {moto.montantPenalite.toLocaleString()} FCFA
              </p>
            </div>
            {canManage && (
              <button
                onClick={() => onPaiement(moto)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                <i className="ri-money-dollar-circle-line mr-2"></i>
                Effectuer le paiement
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
