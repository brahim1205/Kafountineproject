type RecettesStatsProps = {
  total: number;
  count: number;
};

export default function RecettesStats({ total, count }: RecettesStatsProps) {
  const cards = [
    { label: 'Total encaissé', value: total.toLocaleString('fr-FR'), unit: 'FCFA' },
    { label: 'Tickets encaissés', value: count.toLocaleString('fr-FR'), unit: 'tickets payés' },
    { label: 'Montant moyen', value: count ? Math.round(total / count).toLocaleString('fr-FR') : '0', unit: 'FCFA' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">{card.label}</p>
          <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
          <p className="text-xs text-gray-500 mt-1">{card.unit}</p>
        </div>
      ))}
    </div>
  );
}
