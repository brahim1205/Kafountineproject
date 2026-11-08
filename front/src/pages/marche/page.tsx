import { useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import AttributionPlaces from './components/AttributionPlaces';
import SuiviPaiements from './components/SuiviPaiements';
import StatistiquesMarche from './components/StatistiquesMarche';

export default function MarchePage() {
  const [activeTab, setActiveTab] = useState<'attribution' | 'paiements' | 'statistiques'>('attribution');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marché &amp; Commerce</h1>
          <p className="text-sm text-gray-600 mt-1">Attribution des places et suivi des paiements</p>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1 max-w-full overflow-x-auto">
          <button
            onClick={() => setActiveTab('attribution')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'attribution'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <i className="ri-store-2-line mr-2"></i>
            Attribution places
          </button>
          <button
            onClick={() => setActiveTab('paiements')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'paiements'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <i className="ri-money-dollar-circle-line mr-2"></i>
            Suivi paiements
          </button>
          <button
            onClick={() => setActiveTab('statistiques')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'statistiques'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <i className="ri-bar-chart-box-line mr-2"></i>
            Statistiques
          </button>
        </div>

        {/* Contenu */}
        {activeTab === 'attribution' && <AttributionPlaces />}
        {activeTab === 'paiements' && <SuiviPaiements />}
        {activeTab === 'statistiques' && <StatistiquesMarche />}
      </div>
    </DashboardLayout>
  );
}
