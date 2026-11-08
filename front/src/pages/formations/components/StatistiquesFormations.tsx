import type { FormationStats } from '../../../services/formations';

interface StatistiquesFormationsProps {
  stats?: FormationStats;
}

export default function StatistiquesFormations({ stats }: StatistiquesFormationsProps) {
  const maxEvolutionAnnuelle = Math.max(...(stats?.evolutionAnnuelle || []).map((item) => item.nombre || 0), 1);
  const totalDomaines = (stats?.repartitionDomaines || []).reduce((sum, item) => sum + (item.nombre || 0), 0);
  const totalSexes = (stats?.repartitionSexe || []).reduce((sum, item) => sum + (item.nombre || 0), 0);

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <i className="ri-book-line text-white text-lg"></i>
            </div>
            <div>
              <p className="text-sm text-blue-700">Total formations</p>
              <p className="text-2xl font-bold text-blue-900">{stats?.totalFormations || 0}</p>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="text-blue-700">En cours : {stats?.formationsEnCours || 0}</span>
            <span className="text-blue-700">Terminées : {stats?.formationsTerminees || 0}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <i className="ri-team-line text-white text-lg"></i>
            </div>
            <div>
              <p className="text-sm text-purple-700">Jeunes formés</p>
              <p className="text-2xl font-bold text-purple-900">{stats?.totalJeunesFormes || 0}</p>
            </div>
          </div>
            <div className="text-xs text-purple-700 mt-3">
            Certifiés : {stats?.totalCertifies || 0} ({Math.round(((stats?.totalCertifies || 0) / (stats?.totalJeunesFormes || 1)) * 100)}%)
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <i className="ri-award-line text-white text-lg"></i>
            </div>
            <div>
              <p className="text-sm text-green-700">Taux de réussite</p>
              <p className="text-2xl font-bold text-green-900">{stats?.tauxReussiteGlobal || 0}%</p>
            </div>
          </div>
            <div className="text-xs text-green-700 mt-3">
            Budget total : {formatMontant(stats?.budgetTotal || 0)} FCFA
          </div>
        </div>
      </div>

      {/* Répartition par domaine */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <i className="ri-pie-chart-line text-emerald-600"></i>
          Répartition par domaine
        </h3>
        <div className="space-y-3">
          {(stats?.repartitionDomaines || []).map((item, index: number) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{item.domaine}</span>
                <span className="text-sm font-medium text-gray-900">
                  {item.nombre} ({item.pourcentage ?? (totalDomaines > 0 ? Math.round((item.nombre / totalDomaines) * 100) : 0)}%)
                </span>
              </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(item.pourcentage ?? (totalDomaines > 0 ? Math.round((item.nombre / totalDomaines) * 100) : 0), 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Répartition par sexe */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <i className="ri-user-line text-emerald-600"></i>
            Répartition par sexe
          </h3>
          <div className="space-y-4">
            {(stats?.repartitionSexe || []).map((item, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    item.sexe === 'Hommes' ? 'bg-blue-100' : 'bg-pink-100'
                  }`}>
                    <i className={`${
                      item.sexe === 'Hommes' ? 'ri-men-line text-blue-600' : 'ri-women-line text-pink-600'
                    } text-xl`}></i>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{item.sexe}</p>
                    <p className="text-lg font-bold text-gray-900">{item.nombre}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">{item.pourcentage ?? (totalSexes > 0 ? Math.round((item.nombre / totalSexes) * 100) : 0)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Évolution annuelle */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <i className="ri-line-chart-line text-emerald-600"></i>
            Évolution annuelle
          </h3>
          <div className="space-y-4">
            {(stats?.evolutionAnnuelle || []).map((item, index: number) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.annee}</span>
                  <span className="text-lg font-bold text-gray-900">{item.nombre} jeunes</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-500 rounded-full"
                    style={{ width: `${Math.min((item.nombre / maxEvolutionAnnuelle) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Impact social */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-50 rounded-lg border border-emerald-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <i className="ri-heart-line text-emerald-600"></i>
          Impact social
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600 mb-1">{stats?.totalCertifies || 0}</p>
            <p className="text-sm text-gray-700">Jeunes certifiés et prêts pour l'emploi</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600 mb-1">{stats?.totalFormations || 0}</p>
            <p className="text-sm text-gray-700">Formations gratuites organisées</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600 mb-1">{formatMontant(stats?.budgetTotal || 0)}</p>
            <p className="text-sm text-gray-700">FCFA investis dans la formation</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
          <i className="ri-file-excel-line"></i>
          Exporter Excel
        </button>
        <button className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
          <i className="ri-file-pdf-line"></i>
          Exporter PDF
        </button>
        <button className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
          <i className="ri-printer-line"></i>
          Imprimer
        </button>
      </div>
    </div>
  );
}
