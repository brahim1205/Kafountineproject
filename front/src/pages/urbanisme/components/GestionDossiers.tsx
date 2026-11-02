import { useEffect, useState } from 'react';
import RecuPDF from '../../../components/feature/RecuPDF';
import { getDossiersUrbanisme, type DossierUrbanisme } from '../../../services/urbanisme';
import { getTaxServices, type TaxService } from '../../../services/taxes';
import { getStoredUserRole } from '../../../services/auth';
import { useYear } from '../../../contexts/YearContext';
import DossiersTable from './dossiers/DossiersTable';
import DossierDetailModal from './dossiers/DossierDetailModal';
import NouveauDossierModal from './dossiers/NouveauDossierModal';
import { receiptFor, type ReceiptData } from './dossiers/dossiers';

type Modal = { type: 'nouveau' } | { type: 'detail'; dossier: DossierUrbanisme } | null;

export default function GestionDossiers() {
  const { selectedYear } = useYear();
  const isCurrentYear = selectedYear === new Date().getFullYear();
  const canCreate = getStoredUserRole() !== 'super_admin' && isCurrentYear;

  const [dossiers, setDossiers] = useState<DossierUrbanisme[]>([]);
  const [types, setTypes] = useState<TaxService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [created, setCreated] = useState<DossierUrbanisme | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const loadDossiers = async () => {
    try {
      setLoading(true);
      setDossiers((await getDossiersUrbanisme({ limit: 300, year: selectedYear })).data);
    } catch {
      setDossiers([]);
      setError("Impossible de charger les dossiers d'urbanisme.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDossiers();
  }, [selectedYear]);

  useEffect(() => {
    getTaxServices('urbanisme-habitat')
      .then(setTypes)
      .catch(() => setError('Impossible de charger les tarifs urbanisme.'));
  }, []);

  const handleCreated = async (dossier: DossierUrbanisme) => {
    setModal(null);
    setCreated(dossier);
    setTimeout(() => setCreated(null), 6000);
    await loadDossiers();
  };

  return (
    <div className="space-y-4">
      {created && (
        <div role="status" className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-teal-200 p-4 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <i className="ri-check-line text-teal-600 text-xl"></i>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Dossier {created.numero} créé avec succès !</p>
            <button
              onClick={() => {
                setReceipt(receiptFor(created, types));
                setCreated(null);
              }}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-1 underline"
            >
              Imprimer le reçu
            </button>
          </div>
        </div>
      )}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={() => setModal({ type: 'nouveau' })}
            className="px-4 py-2.5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nouveau dossier
          </button>
        </div>
      )}

      <DossiersTable dossiers={dossiers} types={types} loading={loading} onView={(dossier) => setModal({ type: 'detail', dossier })} />

      {modal?.type === 'detail' && (
        <DossierDetailModal
          dossier={modal.dossier}
          types={types}
          onClose={() => setModal(null)}
          onPrint={() => {
            setReceipt(receiptFor(modal.dossier, types));
            setModal(null);
          }}
        />
      )}
      {modal?.type === 'nouveau' && <NouveauDossierModal types={types} onClose={() => setModal(null)} onCreated={handleCreated} />}
      {receipt && <RecuPDF transaction={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
