import { useEffect, useState, useMemo } from 'react';
import {
  getMarcheStats,
  getMarcheDetails,
  type MarcheDetails,
  listPlacesMarche,
  type MarcheStats,
  type PlaceMarche,
} from '../../../services/marche';
import { useYear } from '../../../contexts/YearContext';

type ExtendedMarcheStats = MarcheStats & {
  nouveauxCommercants?: number;
  recettesEnRetard?: number;
};

type PlaceTypeStats = {
  type: string;
  nombre: number;
  montant: number;
  pourcentage: number;
};

type TopCommercant = {
  nom: string;
  activite: string;
  place: string;
  paiements: number;
  montant: number;
};

type MonthlyMarketEvolution = {
  mois: string;
  placesOccuppees: number;
  recettes: number;
};

const EMPTY_STATS: ExtendedMarcheStats = {
  recettesMois: 0,
  placesTotales: 0,
  placesOccupees: 0,
  tauxOccupation: 0,
  nouveauxCommercants: 0,
  recettesEnRetard: 0,
};

export default function StatistiquesMarche() {
  const { selectedYear } = useYear();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [exportType, setExportType] = useState('');
  const [stats, setStats] = useState<ExtendedMarcheStats>(EMPTY_STATS);
  const [places, setPlaces] = useState<PlaceMarche[]>([]);
  const [details, setDetails] = useState<MarcheDetails>({ topCommercants: [], evolutionMensuelle: [] });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [statsData, placesData, detailsData] = await Promise.all([
        getMarcheStats(selectedYear),
        listPlacesMarche(selectedYear),
        getMarcheDetails(selectedYear),
      ]);
      
      setStats(statsData || EMPTY_STATS);
      
      setPlaces(placesData || []);
      setDetails(detailsData);
    } catch {
      setStats(EMPTY_STATS);
      setPlaces([]);
      setDetails({ topCommercants: [], evolutionMensuelle: [] });
      setErrorMsg("Impossible de charger les statistiques du marché.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  // Calculer les statistiques par type de place
  const placesParType = useMemo(() => {
    const grouped = places.reduce<Record<string, { nombre: number; montant: number }>>((acc, place) => {
      const type = place.type || 'Autre';
      if (!acc[type]) {
        acc[type] = { nombre: 0, montant: 0 };
      }
      acc[type].nombre += 1;
      acc[type].montant += place.tarif || 0;
      return acc;
    }, {});

    const total = Object.values(grouped).reduce((sum, item) => sum + (item.montant || 0), 0);

    return Object.entries(grouped).map(([type, data]): PlaceTypeStats => ({
      type,
      nombre: data.nombre,
      montant: data.montant,
      pourcentage: total > 0 ? Math.round((data.montant / total) * 100) : 0,
    }));
  }, [places]);

  // Top commerçants par paiements
  const topCommercants: TopCommercant[] = details.topCommercants;

  // Paiements par mois (6 derniers mois), agrégés par le serveur
  const evolutionMensuelle = useMemo(() => {
    const mois: MonthlyMarketEvolution[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const row = details.evolutionMensuelle.find((item) => item.mois === key);
      mois.push({
        mois: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        placesOccuppees: row?.places || 0,
        recettes: row?.montant || 0,
      });
    }
    return mois;
  }, [details]);

  const handleExport = (type: 'excel' | 'pdf') => {
    setExportType(type);
    setShowSuccessMessage(true);
    
    // Simuler le téléchargement
    const link = document.createElement('a');
    link.href = '#';
    link.download = `statistiques-marche-${new Date().toISOString().split('T')[0]}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {/* Message de succès */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-cyan-200 p-4 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
            <i className="ri-check-line text-cyan-600 text-xl"></i>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Export réussi !</p>
            <p className="text-xs text-gray-600">Le fichier {exportType === 'excel' ? 'Excel' : 'PDF'} a été téléchargé</p>
          </div>
        </div>
      )}

      {/* Boutons d'export */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => handleExport('pdf')}
          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <i className="ri-file-pdf-line"></i>
          Exporter PDF
        </button>
        <button
          onClick={() => handleExport('excel')}
          className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <i className="ri-file-excel-line"></i>
          Exporter Excel
        </button>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <i className="ri-money-dollar-circle-line text-cyan-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{formatMontant(stats.recettesMois)} FCFA</p>
          <p className="text-sm text-gray-600">Recettes du mois</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <i className="ri-store-2-line text-emerald-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{stats.placesOccupees}/{stats.placesTotales}</p>
          <p className="text-sm text-gray-600">Places occupées</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
              <i className="ri-percent-line text-sky-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{stats.tauxOccupation || 0}%</p>
          <p className="text-sm text-gray-600">Taux d'occupation</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <i className="ri-user-add-line text-emerald-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{stats.nouveauxCommercants || 0}</p>
          <p className="text-sm text-gray-600">Nouveaux commerçants</p>
        </div>
      </div>

      {/* Répartition par type */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par type de place</h3>
        {placesParType.length > 0 ? (
          <div className="space-y-4">
            {placesParType.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.type}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{item.nombre} places</span>
                    <span className="text-xs text-gray-500 ml-2">{formatMontant(item.montant)} FCFA/mois</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(item.pourcentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Aucune place enregistrée</p>
        )}
      </div>

      {/* Top commerçants */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Meilleurs commerçants</h3>
        {topCommercants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Rang</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Commerçant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Activité</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Place</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Paiements</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Total versé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topCommercants.map((commercant, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-cyan-600">{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{commercant.nom}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{commercant.activite}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{commercant.place}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{commercant.paiements}</td>
                    <td className="px-4 py-3 text-sm font-medium text-cyan-600 text-right whitespace-nowrap">
                      {formatMontant(commercant.montant)} FCFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Aucun paiement enregistré</p>
        )}
      </div>

      {/* Évolution mensuelle */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des recettes (6 derniers mois)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mois</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Places occupées</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Recettes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {evolutionMensuelle.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.mois}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.placesOccuppees}</td>
                  <td className="px-4 py-3 text-sm font-medium text-cyan-600 text-right">
                    {formatMontant(item.recettes)} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recettes en retard */}
      {stats.recettesEnRetard > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <i className="ri-alert-line text-red-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-red-900">Recettes en retard</p>
              <p className="text-xs text-red-700">{formatMontant(stats.recettesEnRetard)} FCFA</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
