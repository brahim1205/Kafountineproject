import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getContribuable, getPortalToken, logoutPortalRequest } from '../../../services/portalAuth';

interface Tax {
  id: string;
  type: string;
  annee: number;
  montant: number;
  statut: 'PAID' | 'PENDING' | 'OVERDUE';
  dateEcheance: string;
}

interface Contribuable {
  id: string;
  nom: string;
  prenom: string;
  nin: string;
  telephone: string;
}

export default function PortalDashboard() {
  const navigate = useNavigate();
  const [contribuable, setContribuable] = useState<Contribuable | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getPortalToken();
    const contribData = getContribuable() as Contribuable | null;
    
    if (!token || !contribData) {
      navigate('/portal/login');
      return;
    }

    setContribuable(contribData);
    loadTaxes(contribData.id);
  }, [navigate]);

  const loadTaxes = async (contribuableId: string) => {
    try {
      const response = await fetch(`/api/v1/portal/contribuable/${contribuableId}/taxes`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setTaxes(data);
      }
    } catch {
      // Données de démo
      setTaxes([
        { id: '1', type: 'Impôt foncier', annee: 2025, montant: 25000, statut: 'PENDING', dateEcheance: '2025-12-31' },
        { id: '2', type: 'Taxe marché', annee: 2025, montant: 12000, statut: 'PAID', dateEcheance: '2025-06-30' },
        { id: '3', type: 'Redevance parking', annee: 2025, montant: 18000, statut: 'OVERDUE', dateEcheance: '2025-03-31' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutPortalRequest();
    navigate('/portal/login');
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'PAID':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Payé</span>;
      case 'PENDING':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">En attente</span>;
      case 'OVERDUE':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">En retard</span>;
      default:
        return null;
    }
  };

  const totalPending = taxes.filter(t => t.statut !== 'PAID').reduce((sum, t) => sum + t.montant, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <i className="ri-loader-4-line animate-spin text-4xl text-teal-600 mb-2"></i>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-teal-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="ri-community-line text-2xl"></i>
              <div>
                <h1 className="font-bold">Portail Contribuable</h1>
                <p className="text-xs text-teal-200">Commune de Kafountine</p>
              </div>
            </div>
            <button
              onClick={() => { void handleLogout(); }}
              className="px-3 py-1.5 bg-teal-700 rounded-lg text-sm hover:bg-teal-800 transition-colors"
            >
              <i className="ri-logout-circle-line mr-1"></i>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Bienvenue, {contribuable?.prenom} {contribuable?.nom}
          </h2>
          <p className="text-gray-600 text-sm">
            NIN: {contribuable?.nin} • Tél: {contribuable?.telephone}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-teal-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total à payer</p>
                <p className="text-2xl font-bold text-gray-900">{totalPending.toLocaleString()} FCA</p>
              </div>
              <i className="ri-money-dollar-circle-line text-3xl text-teal-500"></i>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Payé</p>
                <p className="text-2xl font-bold text-green-600">
                  {taxes.filter(t => t.statut === 'PAID').reduce((sum, t) => sum + t.montant, 0).toLocaleString()} FCA
                </p>
              </div>
              <i className="ri-checkbox-circle-line text-3xl text-green-500"></i>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En retard</p>
                <p className="text-2xl font-bold text-red-600">
                  {taxes.filter(t => t.statut === 'OVERDUE').length}
                </p>
              </div>
              <i className="ri-alert-line text-3xl text-red-500"></i>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/portal/payer"
            className="bg-teal-600 text-white rounded-xl p-5 shadow-sm hover:bg-teal-700 transition-colors flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <i className="ri-bank-card-line text-2xl"></i>
            </div>
            <div>
              <h3 className="font-bold">Payer mes taxes</h3>
              <p className="text-sm text-teal-100">Paiement mobile (Wave, Orange)</p>
            </div>
          </Link>

          <a
            href="#taxes"
            className="bg-white text-gray-900 rounded-xl p-5 shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-4 border"
          >
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
              <i className="ri-file-text-line text-2xl text-teal-600"></i>
            </div>
            <div>
              <h3 className="font-bold">Mes reçus</h3>
              <p className="text-sm text-gray-600">Télécharger mes reçus</p>
            </div>
          </a>
        </div>

        {/* Taxes List */}
        <div id="taxes" className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-900">Mes Taxes et Impôts</h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            {taxes.map((tax) => (
              <div key={tax.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{tax.type}</p>
                  <p className="text-sm text-gray-500">Année {tax.annee} • Échéance: {new Date(tax.dateEcheance).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{tax.montant.toLocaleString()} FCA</p>
                  {getStatutBadge(tax.statut)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help */}
        <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
          <i className="ri-information-line text-xl text-blue-600 mt-0.5"></i>
          <div>
            <p className="font-medium text-blue-900">Besoin d'aide ?</p>
            <p className="text-sm text-blue-700">
             Contactez la recette communale au 33 123 45 67 ou venez directement à la mairie.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
