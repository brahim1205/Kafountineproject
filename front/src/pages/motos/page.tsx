import { useEffect, useState } from 'react';
import type { MotoPayment } from '../../services/motos';
import DashboardLayout from '../../components/feature/DashboardLayout';
import RecuPDF from '../../components/feature/RecuPDF';
import { getMotoConfiguration, getMotosStats, type MotoStats } from '../../services/motos';
import { getStoredUserRole, canWriteData } from '../../services/auth';
import { useYear } from '../../contexts/YearContext';
import MotosStats from './components/MotosStats';
import MotoList from './components/MotoList';
import MotoPaymentsTable from './components/MotoPaymentsTable';
import MotosEnRetard from './components/MotosEnRetard';
import EnregistrementMotoModal from './components/EnregistrementMotoModal';
import PaiementMotoModal from './components/PaiementMotoModal';
import ChangementMotoModal from './components/ChangementMotoModal';
import {
  FULL_DATE,
  SHORT_TIME,
  toUiMotoPayment, libellePaiement,
  type MotoConfig,
  type ReceiptData,
  type UiMoto,
  type UiMotoPayment,
} from './types';

type Tab = 'liste' | 'paiements' | 'retards';
type Modal = { type: 'enregistrement' } | { type: 'paiement' | 'changement'; moto: UiMoto } | null;

const EMPTY_STATS: MotoStats = { totalMotos: 0, paiementsMois: 0, enRetard: 0, recettesMois: 0 };
const EMPTY_CONFIG: MotoConfig = { droitAdhesion: 0, tarifMensuel: 0, penaliteRetard: 0, amendePolice: 0 };

export default function MotosPage() {
  const { selectedYear } = useYear();
  const isCurrentYear = selectedYear === new Date().getFullYear();
  const userRole = getStoredUserRole() || 'admin';
  const canManage = canWriteData(userRole) && isCurrentYear;

  const [activeTab, setActiveTab] = useState<Tab>(userRole === 'admin' ? 'paiements' : 'liste');
  const [modal, setModal] = useState<Modal>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [stats, setStats] = useState<MotoStats>(EMPTY_STATS);
  const [motoConfig, setMotoConfig] = useState<MotoConfig>(EMPTY_CONFIG);

  const loadData = async () => {
    try {
      setError('');
      const [statsData, config] = await Promise.all([getMotosStats(selectedYear), getMotoConfiguration()]);
      setReloadKey((key) => key + 1);
      setStats(statsData || {});
      setMotoConfig(config || EMPTY_CONFIG);
    } catch {
      setStats(EMPTY_STATS);
      setMotoConfig(EMPTY_CONFIG);
      setError('Impossible de charger les données des motos.');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);


  const showSuccess = (message: string, then?: () => void) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
      then?.();
    }, then ? 1000 : 3000);
  };

  const afterSave = (message: string) => async () => {
    setModal(null);
    await loadData();
    showSuccess(message);
  };

  const afterPayment = async (paymentReceipt: ReceiptData) => {
    setModal(null);
    await loadData();
    showSuccess('Paiement enregistré avec succès !', () => setReceipt(paymentReceipt));
  };

  // À l'enregistrement, le reçu du droit d'adhésion s'ouvre directement.
  const afterRegistration = async (adhesion?: MotoPayment) => {
    setModal(null);
    await loadData();
    showSuccess('Moto enregistrée, droit d’adhésion encaissé !', adhesion ? () => imprimerRecu(toUiMotoPayment(adhesion)) : undefined);
  };

  const imprimerRecu = (paiement: UiMotoPayment) => {
    const date = paiement.datePaiement ? new Date(paiement.datePaiement) : new Date();
    setReceipt({
      numero: paiement.numeroRecu || '',
      date: date.toLocaleDateString('fr-FR', FULL_DATE),
      heure: date.toLocaleTimeString('fr-FR', SHORT_TIME),
      contribuable: paiement.proprietaire,
      type: libellePaiement(paiement),
      montant: paiement.montant,
      agent: paiement.agent,
    });
  };

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    ...(userRole === 'admin' ? [] : [{ id: 'liste' as const, label: 'Liste des motos', icon: 'ri-list-check' }]),
    { id: 'paiements', label: 'Paiements récents', icon: 'ri-money-dollar-circle-line' },
    { id: 'retards', label: `Retards (${stats.enRetard || 0})`, icon: 'ri-alarm-warning-line' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {successMessage && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
            <i className="ri-checkbox-circle-line text-2xl"></i>
            <div>
              <p className="font-medium">{successMessage}</p>
              {successMessage.includes('Paiement') && <p className="text-xs text-emerald-100">Génération du reçu en cours...</p>}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Motos Jakarta</h1>
            <p className="text-sm text-gray-600 mt-1">Suivi des motos-taxis et paiements mensuels</p>
          </div>
          {canManage && (
            <button
              onClick={() => setModal({ type: 'enregistrement' })}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line text-lg"></i>
              Nouvelle Moto
            </button>
          )}
        </div>

        <MotosStats stats={stats} />

        <div className="bg-white rounded-xl border border-gray-100">
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className={`${tab.icon} text-base mr-2`}></i>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'liste' && (
              <MotoList
                year={selectedYear}
                reloadKey={reloadKey}
                canManage={canManage}
                onPaiement={(moto) => setModal({ type: 'paiement', moto })}
                onChangement={(moto) => setModal({ type: 'changement', moto })}
              />
            )}
            {activeTab === 'paiements' && (
              <MotoPaymentsTable year={selectedYear} reloadKey={reloadKey} canManage={canManage} onImprimerRecu={imprimerRecu} />
            )}
            {activeTab === 'retards' && (
              <MotosEnRetard
                year={selectedYear}
                reloadKey={reloadKey}
                motoConfig={motoConfig}
                canManage={canManage}
                onPaiement={(moto) => setModal({ type: 'paiement', moto })}
              />
            )}
          </div>
        </div>

        {canManage && modal?.type === 'enregistrement' && (
          <EnregistrementMotoModal
            selectedYear={selectedYear}
            onClose={() => setModal(null)}
            droitAdhesion={motoConfig.droitAdhesion}
            onSaved={afterRegistration}
          />
        )}
        {canManage && modal?.type === 'paiement' && (
          <PaiementMotoModal
            moto={modal.moto}
            motoConfig={motoConfig}
            onClose={() => setModal(null)}
            onPaid={afterPayment}
          />
        )}
        {canManage && modal?.type === 'changement' && (
          <ChangementMotoModal
            moto={modal.moto}
            onClose={() => setModal(null)}
            onSaved={afterSave('Changement enregistré avec succès !')}
          />
        )}

        {receipt && <RecuPDF transaction={receipt} onClose={() => setReceipt(null)} />}
      </div>
    </DashboardLayout>
  );
}
