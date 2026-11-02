import { useState } from 'react';
import { formatDate, type UiMoto } from '../types';

type MotoListProps = {
  motos: UiMoto[];
  canManage: boolean;
  onPaiement: (moto: UiMoto) => void;
  onChangement: (moto: UiMoto) => void;
};

export default function MotoList({ motos, canManage, onPaiement, onChangement }: MotoListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('Tous');

  const search = searchTerm.toLowerCase();
  const filteredMotos = motos.filter((moto) => {
    const matchSearch =
      (moto.matricule || '').toLowerCase().includes(search) ||
      (moto.proprietaire?.nom || '').toLowerCase().includes(search) ||
      (moto.conducteur?.nom || '').toLowerCase().includes(search);
    const matchStatut =
      filterStatut === 'Tous' ||
      (filterStatut === 'En retard' && moto.enRetard) ||
      (filterStatut === 'À jour' && !moto.enRetard);
    return matchSearch && matchStatut;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
            <input
              type="text"
              placeholder="Rechercher par matricule, propriétaire ou conducteur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
        >
          <option>Tous</option>
          <option>À jour</option>
          <option>En retard</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredMotos.map((moto) => (
          <div key={moto.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex gap-4">
              {moto.photo ? (
                <img src={moto.photo} alt={`${moto.marque} ${moto.modele}`} className="w-32 h-24 object-cover rounded-lg" />
              ) : (
                <div className="w-32 h-24 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                  <i className="ri-motorbike-line text-3xl"></i>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{moto.matricule}</h3>
                    <p className="text-sm text-gray-600">{moto.marque} {moto.modele} ({moto.annee})</p>
                  </div>
                  {moto.enRetard ? (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded whitespace-nowrap">En retard</span>
                  ) : (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded whitespace-nowrap">À jour</span>
                  )}
                </div>

                <div className="space-y-1 text-sm mb-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <i className="ri-user-line text-base"></i>
                    <span>Propriétaire: {moto.proprietaire.nom}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <i className="ri-steering-2-line text-base"></i>
                    <span>Conducteur: {moto.conducteur.nom}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <i className="ri-calendar-line text-base"></i>
                    <span>Prochain paiement: {formatDate(moto.prochainPaiement, 'Non défini')}</span>
                  </div>
                  {moto.enRetard && (
                    <div className="flex items-center gap-2 text-red-600 font-medium">
                      <i className="ri-error-warning-line text-base"></i>
                      <span>Retard: {moto.joursRetard} jours - Pénalité: {moto.montantPenalite?.toLocaleString()} FCFA</span>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onPaiement(moto)}
                      className="flex-1 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <i className="ri-money-dollar-circle-line mr-1"></i>
                      Paiement
                    </button>
                    <button
                      onClick={() => onChangement(moto)}
                      title="Déclarer un changement"
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <i className="ri-exchange-line"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
