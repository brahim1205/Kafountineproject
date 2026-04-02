import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../components/feature/Toast';
import { savePortalSession } from '../../../services/portalAuth';

export default function PortalLogin() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nin: '',
    telephone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...(formData.nin.trim() ? { nin: formData.nin.trim() } : {}),
        ...(formData.telephone.trim() ? { telephone: formData.telephone.trim() } : {}),
      };

      if (!payload.nin && !payload.telephone) {
        throw new Error('Veuillez renseigner un NIN ou un numéro de téléphone');
      }

      const response = await fetch('/api/v1/portal/auth/contribuable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Identifiants invalides');
      }

      const data = await response.json();
      
      savePortalSession(data.token, data.contribuable);
      
      showToast('Connexion réussie', 'success');
      navigate('/portal/dashboard');
    } catch {
      showToast('Numéro NIN ou téléphone invalide', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-teal-600 p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="ri-community-line text-3xl text-teal-600"></i>
          </div>
          <h1 className="text-2xl font-bold text-white">Portail Contribuable</h1>
          <p className="text-teal-100 text-sm">Commune de Kafountine</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro NIN (Carte d'identité)
            </label>
            <input
              type="text"
              value={formData.nin}
              onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
              placeholder="Ex: 1234567890123"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OU</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              placeholder="Ex: 77 123 45 67"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                Connexion...
              </>
            ) : (
              <>
                <i className="ri-login-circle-line"></i>
                Se connecter
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-600">
            Propriétaire d'une moto ? Utilisez votre NIN ou votre numéro de téléphone pour consulter vos taxes et paiements.
          </p>
        </div>
      </div>
    </div>
  );
}
