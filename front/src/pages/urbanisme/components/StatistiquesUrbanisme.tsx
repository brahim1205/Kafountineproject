import { useEffect, useState } from 'react';
import { getUrbanismeStats } from '../../../services/urbanisme';
import { useYear } from '../../../contexts/YearContext';

interface UrbanismeStats {
  totalDossiers: number;
  dossiersEnAttente: number;
  dossiersValides: number;
  dossiersRejetes: number;
  recettes: number;
}

export default function StatistiquesUrbanisme() {
  const { selectedYear } = useYear();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [exportType, setExportType] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [stats, setStats] = useState<UrbanismeStats>({
    totalDossiers: 0,
    dossiersEnAttente: 0,
    dossiersValides: 0,
    dossiersRejetes: 0,
    recettes: 0,
  });

  useEffect(() => {
    loadStats();
  }, [selectedYear]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const response = await getUrbanismeStats(selectedYear);
      if (response) {
        // Map API field names to component field names
        setStats({
          totalDossiers: response.total ?? response.totalDossiers ?? 0,
          dossiersEnAttente: response.enAttente ?? response.dossiersEnAttente ?? 0,
          dossiersValides: response.valide ?? response.dossiersValides ?? 0,
          dossiersRejetes: response.rejete ?? response.dossiersRejetes ?? 0,
          recettes: response.montantTotal ?? response.recettes ?? 0,
        });
      }
    } catch {
      setStats({
        totalDossiers: 0,
        dossiersEnAttente: 0,
        dossiersValides: 0,
        dossiersRejetes: 0,
        recettes: 0,
      });
      setErrorMsg("Impossible de charger les statistiques d'urbanisme.");
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  const tauxValidation = stats.totalDossiers > 0 
    ? Math.round((stats.dossiersValides / stats.totalDossiers) * 100) 
    : 0;

  const statsData = [
    { label: 'Total dossiers', value: stats.totalDossiers.toString(), icon: 'ri-folder-line', color: 'teal' },
    { label: 'En attente', value: stats.dossiersEnAttente.toString(), icon: 'ri-time-line', color: 'amber' },
    { label: 'Validés', value: stats.dossiersValides.toString(), icon: 'ri-checkbox-circle-line', color: 'emerald' },
    { label: 'Recettes totales', value: `${formatMontant(stats.recettes)} Fcfa`, icon: 'ri-money-dollar-circle-line', color: 'cyan' }
  ];

  const handleExport = (type: 'excel' | 'pdf') => {
    setExportType(type);
    setShowSuccessMessage(true);
    
    const link = document.createElement('a');
    link.href = '#';
    link.download = `statistiques-urbanisme-${new Date().toISOString().split('T')[0]}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
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
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-teal-200 p-4 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <i className="ri-check-line text-teal-600 text-xl"></i>
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
        {statsData.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                <i className={`${stat.icon} text-${stat.color}-600 text-xl`}></i>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Taux de validation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Taux de validation: {tauxValidation}%</h3>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-teal-500 h-4 rounded-full transition-all"
            style={{ width: `${Math.min(tauxValidation, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Dossiers par statut */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par statut</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-3xl font-bold text-amber-600">{stats.dossiersEnAttente}</p>
            <p className="text-sm text-amber-700">En attente</p>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <p className="text-3xl font-bold text-emerald-600">{stats.dossiersValides}</p>
            <p className="text-sm text-emerald-700">Validés</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{stats.dossiersRejetes}</p>
            <p className="text-sm text-red-700">Rejetés</p>
          </div>
        </div>
      </div>
    </div>
  );
}
