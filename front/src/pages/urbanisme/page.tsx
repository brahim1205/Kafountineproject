import { useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import GestionDossiers from './components/GestionDossiers';
import ValidationDossiers from './components/ValidationDossiers';
import StatistiquesUrbanisme from './components/StatistiquesUrbanisme';

export default function UrbanismePage() {
  const [activeTab, setActiveTab] = useState<'dossiers' | 'validation' | 'statistiques'>('dossiers');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Urbanisme & Habitat</h1>
          <p className="text-sm text-gray-600 mt-1">Gestion des dossiers et validations</p>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1 max-w-full overflow-x-auto">
          <button
            onClick={() => setActiveTab('dossiers')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'dossiers'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <i className="ri-folder-line mr-2"></i>
            Gestion des dossiers
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'validation'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <i className="ri-checkbox-circle-line mr-2"></i>
            Validation
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
        {activeTab === 'dossiers' && <GestionDossiers />}
        {activeTab === 'validation' && <ValidationDossiers />}
        {activeTab === 'statistiques' && <StatistiquesUrbanisme />}
      </div>
    </DashboardLayout>
  );
}
