type BudgetSummaryProps = {
  totalPrevu: number;
  totalDepenses: number;
};

export default function BudgetSummary({ totalPrevu, totalDepenses }: BudgetSummaryProps) {
  const totalReste = totalPrevu - totalDepenses;
  const positif = totalReste >= 0;
  const cards = [
    { label: 'Budget Total', value: totalPrevu, valueClass: 'text-gray-900', icon: 'ri-money-dollar-circle-line', tone: 'bg-emerald-100 text-emerald-600' },
    { label: 'Total Dépensé', value: totalDepenses, valueClass: 'text-gray-900', icon: 'ri-money-dollar-box-line', tone: 'bg-amber-100 text-amber-600' },
    {
      label: 'Reste à Disposer',
      value: totalReste,
      valueClass: positif ? 'text-green-600' : 'text-red-600',
      icon: 'ri-wallet-3-line',
      tone: positif ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{card.label}</p>
              <h3 className={`text-xl font-bold mt-1 ${card.valueClass}`}>{card.value.toLocaleString('fr-FR')} FCFA</h3>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${card.tone}`}>
              <i className={`${card.icon} text-xl`}></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
