import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useToast } from '../../../components/feature/Toast';
import { restorePortalSession } from '../../../services/portalAuth';

interface Tax {
  id: string;
  type: string;
  annee: number;
  montant: number;
  selected: boolean;
}

type PaymentMethod = 'wave' | 'orange' | 'free';

export default function PortalPayer() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'select' | 'payment' | 'confirm'>('select');
  // null : disponibilité en cours de vérification. Désactivé tant qu'aucun opérateur ne confirme les encaissements.
  const [onlinePayment, setOnlinePayment] = useState<{ enabled: boolean; message: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/v1/portal/payment/availability', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => setOnlinePayment(json?.data ?? { enabled: false, message: null }))
      .catch(() => setOnlinePayment({ enabled: false, message: null }));
  }, []);

  // Vérifier le statut du paiement après retour de Wave/Orange
  useEffect(() => {
    const status = searchParams.get('status');
    const txId = searchParams.get('tx_id');
    
    if (status === 'success' && txId) {
      handlePaymentSuccess(txId);
    } else if (status === 'failed') {
      showToast('Paiement annulé ou échoué', 'error');
      setStep('select');
    }
  }, [searchParams, showToast]);

  // Charger les taxes à payer
  useEffect(() => {
    let mounted = true;

    restorePortalSession().then((contribData) => {
      if (!mounted) return;
      if (!contribData) {
        navigate('/portal/login');
        return;
      }

      void loadTaxes(contribData.id);
    });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const loadTaxes = async (contribuableId: string) => {
    try {
      const response = await fetch(`/api/v1/portal/contribuable/${contribuableId}/taxes`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Impossible de charger les taxes');
      }

      const data = await response.json();
      const unpaidTaxes = Array.isArray(data)
        ? data
            .filter((tax) => tax?.statut !== 'PAID')
            .map((tax, index) => ({
              id: String(tax.id),
              type: String(tax.type || 'Taxe'),
              annee: Number(tax.annee || new Date().getFullYear()),
              montant: Number(tax.montant || 0),
              selected: index === 0,
            }))
        : [];

      setTaxes(unpaidTaxes);
    } catch {
      showToast('Impossible de charger les taxes à payer', 'error');
      setTaxes([]);
    }
  };

  const totalSelected = taxes.filter(t => t.selected).reduce((sum, t) => sum + t.montant, 0);

  const toggleTax = (id: string) => {
    setTaxes(taxes.map(t => 
      t.id === id ? { ...t, selected: !t.selected } : t
    ));
  };

  const handlePaymentSuccess = async (transactionId: string) => {
    try {
      await fetch('/api/v1/portal/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ transactionId }),
      });
      
      showToast('Paiement réussi ! Votre reçu a été envoyé par SMS.', 'success');
      navigate('/portal/dashboard');
    } catch {
      showToast('Erreur lors de la confirmation', 'error');
    }
  };

  const initiatePayment = async () => {
    if (!paymentMethod || !phone) {
      showToast('Veuillez sélectionner un moyen de paiement et entrer votre numéro', 'error');
      return;
    }

    if (taxes.filter(t => t.selected).length === 0) {
      showToast('Veuillez sélectionner au moins une taxe à payer', 'error');
      return;
    }

    setLoading(true);
    setStep('confirm');

    try {
      const response = await fetch('/api/v1/portal/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: totalSelected,
          phone: phone.replace(/\s/g, ''),
          method: paymentMethod,
          taxes: taxes.filter(t => t.selected).map(t => t.id),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Paiement impossible');
      }

      if (paymentMethod === 'wave') {
        window.location.href = data.paymentUrl;
      } else if (paymentMethod === 'orange') {
        setStep('confirm');
      }
    } catch {
      showToast('Erreur lors de la préparation du paiement', 'error');
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const getMethodName = (method: PaymentMethod) => {
    switch (method) {
      case 'wave': return 'Wave';
      case 'orange': return 'Orange Money';
      case 'free': return 'Free Money';
      default: return '';
    }
  };

  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-time-line text-3xl text-yellow-600"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">En attente de confirmation</h2>
          <p className="text-gray-600 mb-6">
            Veuillez confirmer le paiement sur votre téléphone {getMethodName(paymentMethod as PaymentMethod)}
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Montant à payer</p>
            <p className="text-2xl font-bold text-teal-600">{totalSelected.toLocaleString()} FCFA</p>
          </div>

          <Link
            to="/portal/dashboard"
            className="block w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  if (onlinePayment && !onlinePayment.enabled) {
    const totalDu = taxes.reduce((sum, tax) => sum + tax.montant, 0);
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-teal-600 text-white">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <Link to="/portal/dashboard" className="flex items-center gap-2 text-white">
              <i className="ri-arrow-left-line"></i>
              Retour
            </Link>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Mes taxes à payer</h1>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-3">
            <i className="ri-information-line text-xl"></i>
            <p>{onlinePayment.message || "Le paiement en ligne n'est pas encore disponible. Réglez vos taxes au guichet de la mairie."}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {taxes.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">Aucune taxe en attente de paiement.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {taxes.map((tax) => (
                  <li key={tax.id} className="flex items-center justify-between p-4 text-sm">
                    <span className="text-gray-900">
                      {tax.type} — {tax.annee}
                    </span>
                    <span className="font-semibold text-gray-900">{tax.montant.toLocaleString('fr-FR')} FCFA</span>
                  </li>
                ))}
                <li className="flex items-center justify-between p-4 text-sm bg-gray-50">
                  <span className="font-medium text-gray-700">Total dû</span>
                  <span className="font-bold text-teal-700">{totalDu.toLocaleString('fr-FR')} FCFA</span>
                </li>
              </ul>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-teal-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link to="/portal/dashboard" className="flex items-center gap-2 text-white">
            <i className="ri-arrow-left-line"></i>
            Retour
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Paiement de mes taxes</h1>

        {/* Sélection des taxes */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-900">Sélectionner les taxes à payer</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {taxes.map((tax) => (
              <label 
                key={tax.id} 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={tax.selected}
                    onChange={() => toggleTax(tax.id)}
                    className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{tax.type}</p>
                    <p className="text-sm text-gray-500">Année {tax.annee}</p>
                  </div>
                </div>
                <p className="font-bold text-gray-900">{tax.montant.toLocaleString()} FCFA</p>
              </label>
            ))}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Total à payer</span>
              <span className="text-2xl font-bold text-teal-600">{totalSelected.toLocaleString()} FCFA</span>
            </div>
          </div>
        </div>

        {/* Moyen de paiement */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-900">Moyen de paiement</h2>
          </div>
          
          <div className="p-4 space-y-3">
            <label className={`block p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'wave' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="method"
                  value="wave"
                  checked={paymentMethod === 'wave'}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="text-teal-600"
                />
                <i className="ri-water-flash-line text-2xl text-blue-500"></i>
                <div>
                  <p className="font-medium">Wave</p>
                  <p className="text-sm text-gray-500">Paiement instantané</p>
                </div>
              </div>
            </label>

            <label className={`block p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'orange' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="method"
                  value="orange"
                  checked={paymentMethod === 'orange'}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="text-teal-600"
                />
                <i className="ri-phone-line text-2xl text-orange-500"></i>
                <div>
                  <p className="font-medium">Orange Money</p>
                  <p className="text-sm text-gray-500">Via *144#</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Numéro de téléphone */}
        {paymentMethod && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <label className="block font-medium text-gray-700 mb-2">
              Numéro {paymentMethod === 'wave' ? 'Wave' : 'Orange'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="77 123 45 67"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              Le code de confirmation sera envoyé à ce numéro
            </p>
          </div>
        )}

        {/* Bouton payer */}
        <button
          onClick={initiatePayment}
          disabled={loading || !paymentMethod || totalSelected === 0}
          className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <i className="ri-loader-4-line animate-spin"></i>
              Traitement...
            </>
          ) : (
            <>
              <i className="ri-bank-card-line"></i>
              Payer {totalSelected.toLocaleString()} FCFA
            </>
          )}
        </button>

        <p className="text-center text-sm text-gray-500">
          <i className="ri-lock-line"></i>
          Paiement sécurisé par Wave/Orange Money
        </p>
      </main>
    </div>
  );
}
