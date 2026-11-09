import MotoPhoto from './MotoPhoto';
import { useEffect } from 'react';
import Pagination from '../../../components/feature/Pagination';
import { fetchAllPages, useServerList } from '../../../hooks/useServerList';
import { pageMotos } from '../../../services/motos';
import { formatDate, toUiMoto, type MotoConfig, type UiMoto } from '../types';
import { downloadCsv, today } from '../../../utils/csv';

type MotosEnRetardProps = {
  year: number;
  reloadKey: number;
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

async function exporterTout(year: number) {
  const motos = await fetchAllPages((page, limit) => pageMotos({ year, page, limit, etat: 'retard' }));
  exportCsv(motos.map(toUiMoto));
}

export default function MotosEnRetard({ year, reloadKey, motoConfig, canManage, onPaiement }: MotosEnRetardProps) {
  const list = useServerList(
    async ({ page, limit }) => {
      const { data, meta } = await pageMotos({ year, page, limit, etat: 'retard' });
      return { data: data.map(toUiMoto), meta };
    },
    [year],
    { pageSize: 24 }
  );
  const { reload } = list;
  useEffect(() => {
    if (reloadKey) reload();
  }, [reloadKey, reload]);

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => exporterTout(year)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="ri-download-line"></i>
            Télécharger la liste
          </button>
        </div>
      )}
      {list.items.map((moto) => (
        <div key={moto.id} className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex gap-4">
              <MotoPhoto src={moto.photo} alt={`${moto.marque} ${moto.modele}`} sizeClass="w-24 h-20" />
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
      <Pagination page={list.page} totalPages={list.totalPages} total={list.meta.total} unit="moto en retard" onChange={list.setPage} />
    </div>
  );
}
