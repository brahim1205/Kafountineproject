import type { MotoStats } from '../../../services/motos';

const CARDS = [
  { label: 'Total Motos', key: 'totalMotos', icon: 'ri-motorbike-line', tone: 'emerald' },
  { label: 'Paiements ce mois', key: 'paiementsMois', icon: 'ri-checkbox-circle-line', tone: 'blue' },
  { label: 'En retard', key: 'enRetard', icon: 'ri-alarm-warning-line', tone: 'red' },
  { label: 'Recettes du mois', key: 'recettesMois', icon: 'ri-money-dollar-circle-line', tone: 'teal' },
] as const;

const TONES = {
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-blue-600',
  red: 'bg-red-100 text-red-600',
  teal: 'bg-teal-100 text-teal-600',
};

export default function MotosStats({ stats }: { stats: MotoStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => (
        <div key={card.key} className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.key === 'enRetard' ? 'text-red-600' : 'text-gray-900'}`}>
                {card.key === 'recettesMois' ? `${(stats.recettesMois || 0).toLocaleString()} FCFA` : stats[card.key]}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${TONES[card.tone]}`}>
              <i className={`${card.icon} text-2xl`}></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
