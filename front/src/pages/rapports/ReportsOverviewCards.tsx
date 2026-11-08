import type { ReportsOverview } from '../../services/reports';

interface Props {
  total: number;
  tauxRecouvrement: number;
  overview: ReportsOverview | null;
}

export function ReportsOverviewCards({ total, tauxRecouvrement, overview }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm">Total annuel</p>
            <p className="text-3xl font-bold mt-1">{(total / 1000000).toFixed(1)}M</p>
            <p className="text-emerald-100 text-xs mt-1">FCFA</p>
          </div>
          <i className="ri-money-dollar-circle-line text-4xl text-emerald-200"></i>
        </div>
      </div>
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm">Evolution</p>
            <p className="text-3xl font-bold mt-1">{tauxRecouvrement}%</p>
            <p className="text-purple-100 text-xs mt-1">taux de recouvrement</p>
          </div>
          <i className="ri-line-chart-line text-4xl text-purple-200"></i>
        </div>
      </div>
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Transactions</p>
            <p className="text-3xl font-bold mt-1">{overview?.txStats?.annee?.transactions?.toLocaleString('fr-FR') || 0}</p>
            <p className="text-blue-100 text-xs mt-1">tickets emis</p>
          </div>
          <i className="ri-file-list-3-line text-4xl text-blue-200"></i>
        </div>
      </div>
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-100 text-sm">Contribuables</p>
            <p className="text-3xl font-bold mt-1">{overview?.totalContribuables?.toLocaleString('fr-FR') || 0}</p>
            <p className="text-amber-100 text-xs mt-1">inscrits</p>
          </div>
          <i className="ri-user-line text-4xl text-amber-200"></i>
        </div>
      </div>
    </div>
  );
}
