import type { TopContribuable } from './useReportsPage';

interface Props {
  topContribuables: TopContribuable[];
  total: number;
}

export function ReportsTopContribuablesTable({ topContribuables, total }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Contribuables</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Rang</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Contribuable</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Montant total</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">% du total</th>
            </tr>
          </thead>
          <tbody>
            {topContribuables.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  Aucune donnee disponible
                </td>
              </tr>
            )}
            {topContribuables.map((contribuable, index) => (
              <tr key={`${contribuable.name}-${index}`} className="border-b border-gray-100">
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : index === 1
                          ? 'bg-gray-100 text-gray-800'
                          : index === 2
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    #{index + 1}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-900">{contribuable.name}</td>
                <td className="py-3 px-4 text-sm font-medium text-gray-900 text-right">
                  {contribuable.amount.toLocaleString('fr-FR')} FCFA
                </td>
                <td className="py-3 px-4 text-sm text-gray-600 text-right">
                  {total > 0 ? ((contribuable.amount / total) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
