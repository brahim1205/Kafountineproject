import { useState, useEffect } from 'react';

interface Penalite {
  id: string;
  type: string;
  description: string | null;
  montant: number;
  delai: string;
  actif: boolean;
}

export default function PortalPenalites() {
  const [penalites, setPenalites] = useState<Penalite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPenalites();
  }, []);

  const fetchPenalites = async () => {
    try {
      setLoading(true);
      // Utiliser l'endpoint public sans authentification
      const response = await fetch('/api/v1/public/penalites');
      const result = await response.json();
      const data = result.data || result;
      setPenalites(data.filter((p: Penalite) => p.actif));
      setError(null);
    } catch {
      setError('Impossible de charger les pénalités pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des pénalités...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-sm border border-gray-200">
                <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain p-0.5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Kafountine</h1>
                <p className="text-sm text-gray-500">Portail des contribuables</p>
              </div>
            </div>
            <a href="/portal" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
              ← Retour à l'accueil
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <i className="ri-alert-line text-2xl text-teal-600"></i>
            <h2 className="text-2xl font-bold text-gray-900">Pénalités et Amendes</h2>
          </div>
          <p className="text-gray-600">
            Consultez la liste des pénalités applicables en cas de non-respect des arrêtés municipaux.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <i className="ri-information-line text-blue-600 text-xl mt-0.5"></i>
            <div>
              <p className="text-sm text-blue-800">
                <strong>Information importante :</strong> Ces pénalités s'appliquent automatiquement en cas de retard ou de non-respect des réglementations municipales. 
                Il est recommandé de respecter les délais de paiement pour éviter ces majorations.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <i className="ri-error-warning-line text-red-600 text-xl"></i>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Pénalités Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {penalites.map((penalite) => (
            <div
              key={penalite.id}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex-1">{penalite.type}</h3>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Active
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <i className="ri-money-cfa-circle-line text-teal-600"></i>
                  <span className="text-lg font-bold text-teal-600">
                    {formatMontant(penalite.montant)} FCFA
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <i className="ri-time-line"></i>
                  <span>Application : {penalite.delai}</span>
                </div>
                
                {penalite.description && (
                  <p className="text-sm text-gray-500 mt-2">
                    {penalite.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {penalites.length === 0 && !error && (
          <div className="text-center py-12">
            <i className="ri-checkbox-circle-line text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-600">Aucune pénalité n'est actuellement active.</p>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 bg-gray-100 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Besoin d'aide ?</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <i className="ri-phone-line text-teal-600"></i>
              <span>Contact : +221 XX XXX XX XX</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="ri-mail-line text-teal-600"></i>
              <span>Email : contact@kafountine.gouv.sn</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 Commune de Kafountine. Tous droits réservés.</p>
            <p className="mt-1">Portail des contribuables - Gestion des paiements en ligne</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
