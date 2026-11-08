import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useYear } from '../../../contexts/YearContext';
import { getEtatCivilStats, type EtatCivilStats } from '../../../services/etatCivil';
import HistoriqueDemandes from '../../etat-civil/components/HistoriqueDemandes';

const ACTIONS = [
  { label: 'Nouvelle demande', icon: 'ri-file-add-line', to: '/etat-civil/nouvelle', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  { label: 'Nouveau ticket', icon: 'ri-coupon-3-line', to: '/taxes/nouvelle-transaction', color: 'bg-sky-50 text-sky-700 hover:bg-sky-100' },
  { label: 'Taxes état civil', icon: 'ri-file-list-3-line', to: '/taxes/etat-civil', color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
  { label: 'Historique', icon: 'ri-history-line', to: '/etat-civil/historique', color: 'bg-gray-50 text-gray-700 hover:bg-gray-100' },
];

export default function EtatCivilDashboard() {
  const { selectedYear } = useYear();
  const [stats, setStats] = useState<EtatCivilStats | null>(null);

  const load = useCallback(() => {
    getEtatCivilStats(selectedYear).then(setStats).catch(() => setStats(null));
  }, [selectedYear]);

  useEffect(load, [load]);

  const cards = [
    { label: 'Demandes', value: stats?.totalDemandes, icon: 'ri-file-list-3-line', color: 'text-sky-600 bg-sky-50', to: '/etat-civil/historique' },
    { label: 'À traiter', value: stats?.enAttente, icon: 'ri-time-line', color: 'text-amber-600 bg-amber-50', to: '/etat-civil/a-traiter' },
    { label: 'Validées', value: stats?.validees, icon: 'ri-checkbox-circle-line', color: 'text-emerald-600 bg-emerald-50', to: '/etat-civil/statistiques' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">État civil</h1>
        <p className="text-sm text-gray-600 mt-1">Vos demandes et vos taxes au même endroit</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:border-gray-300">
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${card.color}`}>
              <i className={`${card.icon} text-xl`}></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{Number(card.value || 0).toLocaleString('fr-FR')}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ACTIONS.map((action) => (
          <Link key={action.to} to={action.to} className={`rounded-xl p-4 flex items-center gap-3 text-sm font-medium transition-colors ${action.color}`}>
            <i className={`${action.icon} text-xl`}></i>
            {action.label}
          </Link>
        ))}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Demandes à traiter</h2>
        <HistoriqueDemandes statut="EN_ATTENTE" onChanged={load} />
      </div>
    </div>
  );
}
