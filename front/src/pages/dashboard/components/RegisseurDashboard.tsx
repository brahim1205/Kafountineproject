import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useYear } from '../../../contexts/YearContext';
import { getMotosStats, type MotoStats } from '../../../services/motos';
import { listUsers, type UserItem } from '../../../services/users';

const EQUIPES = [
  { role: 'AGENT', label: 'Agents de terrain', icon: 'ri-user-location-line', color: 'text-sky-600 bg-sky-50' },
  { role: 'QUAI_PECHE', label: 'Agents quai de pêche', icon: 'ri-ship-line', color: 'text-emerald-600 bg-emerald-50' },
  { role: 'SERVICE_FINANCES', label: 'Service finances', icon: 'ri-bank-card-line', color: 'text-emerald-600 bg-emerald-50' },
];

const ACTIONS = [
  { label: 'Équipes et rôles', icon: 'ri-team-line', to: '/utilisateurs' },
  { label: 'Motos', icon: 'ri-motorbike-line', to: '/motos' },
  { label: 'Recettes', icon: 'ri-money-dollar-circle-line', to: '/recettes' },
  { label: 'Taxes', icon: 'ri-file-list-3-line', to: '/taxes' },
  { label: 'Marché', icon: 'ri-store-2-line', to: '/marche' },
  { label: 'Quai de pêche', icon: 'ri-ship-2-line', to: '/quai-peche' },
];

export default function RegisseurDashboard() {
  const { selectedYear } = useYear();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [motos, setMotos] = useState<MotoStats>({});

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
    getMotosStats(selectedYear).then(setMotos).catch(() => setMotos({}));
  }, [selectedYear]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Régie municipale</h1>
        <p className="text-sm text-gray-600 mt-1">Vos équipes et le suivi des recettes</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Équipes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {EQUIPES.map((equipe) => (
            <Link key={equipe.role} to="/utilisateurs" className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:border-gray-300">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${equipe.color}`}>
                <i className={`${equipe.icon} text-xl`}></i>
              </div>
              <div>
                <p className="text-sm text-gray-600">{equipe.label}</p>
                <p className="text-2xl font-bold text-gray-900">{users.filter((user) => user.role === equipe.role && user.isActive).length}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Motos Jakarta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Motos enregistrées', value: `${motos.totalMotos || 0}` },
            { label: 'En retard', value: `${motos.enRetard || 0}` },
            { label: 'Recettes de l’année', value: `${Number(motos.recettesAnnee || 0).toLocaleString('fr-FR')} FCFA` },
          ].map((card) => (
            <Link key={card.label} to="/motos" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300">
              <p className="text-sm text-gray-600">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {ACTIONS.map((action) => (
          <Link key={action.to} to={action.to} className="rounded-xl p-4 flex flex-col items-center gap-2 text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors">
            <i className={`${action.icon} text-xl`}></i>
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
