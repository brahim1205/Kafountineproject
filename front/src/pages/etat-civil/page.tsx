import { useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import TraiterDemande from './components/TraiterDemande';
import HistoriqueDemandes from './components/HistoriqueDemandes';
import StatistiquesEtatCivil from './components/StatistiquesEtatCivil';

export default function EtatCivilPage() {
  const [activeTab, setActiveTab] = useState<'historique' | 'statistiques'>('historique');
  const [showNouvelleDemande, setShowNouvelleDemande] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">État Civil</h1>
            <p className="text-sm text-gray-600 mt-1">Traitement des demandes et génération de documents</p>
          </div>
          <button
            onClick={() => setShowNouvelleDemande(true)}
            className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <i className="ri-add-line"></i>
            Nouvelle demande
          </button>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1">
          <button
            onClick={() => setActiveTab('historique')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'historique'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <i className="ri-history-line mr-2"></i>
            Historique
          </button>
          <button
            onClick={() => setActiveTab('statistiques')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'statistiques'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <i className="ri-bar-chart-box-line mr-2"></i>
            Statistiques
          </button>
        </div>

        {/* Contenu */}
        {activeTab === 'historique' && <HistoriqueDemandes />}
        {activeTab === 'statistiques' && <StatistiquesEtatCivil />}
      </div>

      {/* Modal Nouvelle demande */}
      {showNouvelleDemande && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle demande</h3>
                <p className="text-sm text-gray-500">Remplissez le formulaire pour traiter une demande</p>
              </div>
              <button
                onClick={() => setShowNouvelleDemande(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-6">
              <TraiterDemande onSuccess={() => setShowNouvelleDemande(false)} />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
