export default function RevenueChart() {
  const data = [
    { day: 'Lun', amount: 1800000 },
    { day: 'Mar', amount: 2100000 },
    { day: 'Mer', amount: 1950000 },
    { day: 'Jeu', amount: 2300000 },
    { day: 'Ven', amount: 2450000 },
    { day: 'Sam', amount: 2200000 },
    { day: 'Dim', amount: 1600000 }
  ];

  const maxAmount = Math.max(...data.map(d => d.amount));

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Évolution des recettes</h3>
          <p className="text-sm text-gray-600 mt-1">Recettes hebdomadaires</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500"></div>
            <span className="text-xs text-gray-600">Recettes</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600 w-8">{item.day}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((item.amount / maxAmount) * 100, 100)}%` }}
              ></div>
            </div>
            <span className="text-xs font-semibold text-gray-900 w-24 text-right">
              {(item.amount / 1000000).toFixed(2)}M
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total hebdomadaire</span>
          <span className="text-lg font-bold text-gray-900">14 400 000 FCFA</span>
        </div>
      </div>
    </div>
  );
}
