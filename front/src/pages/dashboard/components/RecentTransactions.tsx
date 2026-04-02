export default function RecentTransactions() {
  const transactions = [
    {
      id: 'TKT-2025-00156',
      type: 'Ticket journalier',
      contributor: 'Mamadou Diarra',
      agent: 'Kouassi Jean',
      amount: 5000,
      time: '14:32',
      status: 'completed'
    },
    {
      id: 'TKT-2025-00155',
      type: 'Occupation domaine public',
      contributor: 'Aïcha Touré',
      agent: 'Diallo Fatou',
      amount: 15000,
      time: '14:18',
      status: 'completed'
    },
    {
      id: 'TKT-2025-00154',
      type: 'Taxe municipale',
      contributor: 'Yao Kouadio',
      agent: 'Traoré Moussa',
      amount: 25000,
      time: '13:55',
      status: 'completed'
    },
    {
      id: 'TKT-2025-00153',
      type: 'Ticket journalier',
      contributor: 'Fofana Ibrahim',
      agent: 'Koné Aminata',
      amount: 5000,
      time: '13:42',
      status: 'completed'
    },
    {
      id: 'TKT-2025-00152',
      type: 'Occupation domaine public',
      contributor: 'Sanogo Marie',
      agent: 'Bamba Sekou',
      amount: 12000,
      time: '13:28',
      status: 'completed'
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Transactions récentes</h3>
            <p className="text-sm text-gray-600 mt-1">Dernières opérations effectuées</p>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors whitespace-nowrap">
            Voir tout
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                N° Ticket
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Contribuable
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Agent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Montant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Heure
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((transaction, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{transaction.id}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700">{transaction.type}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700">{transaction.contributor}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700">{transaction.agent}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-gray-900">{transaction.amount.toLocaleString()} FCFA</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{transaction.time}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    <i className="ri-check-line mr-1"></i>
                    Complété
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}