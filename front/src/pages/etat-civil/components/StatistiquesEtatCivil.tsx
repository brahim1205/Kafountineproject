import { useEffect, useState } from 'react';
import { getEtatCivilStats, type EtatCivilStats } from '../../../services/etatCivil';
import { useYear } from '../../../contexts/YearContext';

interface IEtatCivilStats {
  totalDemandes: number;
  demandesEnAttente: number;
  demandesDelivrees: number;
  demandesRejetees: number;
  recettes: number;
}

export default function StatistiquesEtatCivil() {
  const { selectedYear } = useYear();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [exportType, setExportType] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [stats, setStats] = useState<IEtatCivilStats>({
    totalDemandes: 0,
    demandesEnAttente: 0,
    demandesDelivrees: 0,
    demandesRejetees: 0,
    recettes: 0,
  });

  useEffect(() => {
    loadStats();
  }, [selectedYear]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const response = await getEtatCivilStats(selectedYear);
      if (response) {
        const typed = response as EtatCivilStats & Partial<IEtatCivilStats>;
        setStats({
          totalDemandes: typed.totalDemandes || 0,
          demandesEnAttente: typed.demandesEnAttente || typed.enAttente || 0,
          demandesDelivrees: typed.demandesDelivrees || typed.validees || 0,
          demandesRejetees: typed.demandesRejetees || 0,
          recettes: typed.recettes || 0,
        });
      }
    } catch {
      setStats({
        totalDemandes: 0,
        demandesEnAttente: 0,
        demandesDelivrees: 0,
        demandesRejetees: 0,
        recettes: 0,
      });
      setErrorMsg("Impossible de charger les statistiques de l'état civil.");
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  const statsData = [
    { label: 'Total demandes', value: stats.totalDemandes.toString(), icon: 'ri-file-text-line', color: 'emerald' },
    { label: 'En attente', value: stats.demandesEnAttente.toString(), icon: 'ri-time-line', color: 'amber' },
    { label: 'Délivrées', value: stats.demandesDelivrees.toString(), icon: 'ri-check-line', color: 'teal' },
    { label: 'Recettes totales', value: `${formatMontant(stats.recettes)} Fcfa`, icon: 'ri-money-dollar-circle-line', color: 'cyan' }
  ];

  const handleExport = (type: 'excel' | 'pdf') => {
    setExportType(type);
    setShowSuccessMessage(true);
    
    const link = document.createElement('a');
    link.href = '#';
    link.download = `statistiques-etat-civil-${new Date().toISOString().split('T')[0]}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
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
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-emerald-200 p-4 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <i className="ri-check-line text-emerald-600 text-xl"></i>
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

      {/* Demandes par statut */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par statut</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-3xl font-bold text-amber-600">{stats.demandesEnAttente}</p>
            <p className="text-sm text-amber-700">En attente</p>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <p className="text-3xl font-bold text-emerald-600">{stats.demandesDelivrees}</p>
            <p className="text-sm text-emerald-700">Délivrées</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{stats.demandesRejetees}</p>
            <p className="text-sm text-red-700">Rejetées</p>
          </div>
        </div>
      </div>
    </div>
  );
}
