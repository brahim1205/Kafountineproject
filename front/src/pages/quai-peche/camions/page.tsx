import { useEffect, useMemo, useState } from 'react';
import { useYear } from '../../../contexts/YearContext';
import DashboardLayout from '../../../components/feature/DashboardLayout';
import { getStoredUserRole } from '../../../services/auth';
import { deleteCamion, listCamions, listExpeditions, type CamionFrigorifique, type Expedition } from '../../../services/quai-peche';
import { downloadCsv, today } from '../../../utils/csv';
import CamionsTable from './components/CamionsTable';
import ExpeditionsTable from './components/ExpeditionsTable';
import CamionModal from './components/CamionModal';
import ExpeditionModal from './components/ExpeditionModal';
import DetailModal from './components/DetailModal';
import { STATUTS_CAMION, STATUTS_EXPEDITION, formatDate } from './components/statuts';

type Tab = 'camions' | 'expeditions';
type ModalState =
  | { type: 'camion' | 'expedition' }
  | { type: 'detail-camion'; item: CamionFrigorifique }
  | { type: 'detail-expedition'; item: Expedition }
  | null;

export default function CamionsPage() {
  const { selectedYear } = useYear();
  const isCurrentYear = selectedYear === new Date().getFullYear();
  const role = getStoredUserRole();
  // Mêmes règles que l'API : création/modification par le quai de pêche et les admins, suppression par les admins.
  const canManage = isCurrentYear && (role === 'admin' || role === 'super_admin' || role === 'quai_peche');
  const canDelete = isCurrentYear && (role === 'admin' || role === 'super_admin');

  const [camions, setCamions] = useState<CamionFrigorifique[]>([]);
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<Tab>('camions');
  const [modal, setModal] = useState<ModalState>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [camionsData, expeditionsData] = await Promise.all([
        listCamions({ year: selectedYear, limit: 100 }),
        listExpeditions({ year: selectedYear, limit: 100 }),
      ]);
      setCamions(camionsData);
      setExpeditions(expeditionsData);
    } catch {
      setCamions([]);
      setExpeditions([]);
      setErrorMsg('Impossible de charger les camions et expéditions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setStatutFilter('all');
  };

  const search = searchTerm.toLowerCase();
  const filteredCamions = useMemo(
    () =>
      camions.filter(
        (c) =>
          (statutFilter === 'all' || c.statut === statutFilter) &&
          [c.immatriculation, c.marque, c.chauffeur].some((value) => value?.toLowerCase().includes(search))
      ),
    [camions, search, statutFilter]
  );
  const filteredExpeditions = useMemo(
    () =>
      expeditions.filter(
        (e) =>
          (statutFilter === 'all' || e.statut === statutFilter) &&
          [e.numero, e.destination, e.camion?.immatriculation].some((value) => value?.toLowerCase().includes(search))
      ),
    [expeditions, search, statutFilter]
  );

  const stats = [
    { label: 'Total camions', value: camions.length, icon: 'ri-truck-line', tone: 'bg-blue-100 text-blue-600' },
    { label: 'Camions actifs', value: camions.filter((c) => c.statut === 'ACTIF').length, icon: 'ri-checkbox-circle-line', tone: 'bg-green-100 text-green-600' },
    { label: 'Expéditions', value: expeditions.length, icon: 'ri-send-plane-line', tone: 'bg-teal-100 text-teal-600' },
    {
      label: 'Recettes transport',
      value: `${expeditions.reduce((sum, e) => sum + (e.montant || 0), 0).toLocaleString('fr-FR')} FCFA`,
      icon: 'ri-money-dollar-circle-line',
      tone: 'bg-emerald-100 text-emerald-600',
    },
  ];
  const statuts = activeTab === 'camions' ? STATUTS_CAMION : STATUTS_EXPEDITION;

  const afterChange = async () => {
    setModal(null);
    await loadData();
  };

  const supprimerCamion = async (camion: CamionFrigorifique) => {
    if (!confirm(`Supprimer le camion ${camion.immatriculation} ?`)) return;
    try {
      setErrorMsg('');
      await deleteCamion(camion.id);
      await loadData();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Impossible de supprimer le camion.');
    }
  };

  const exporter = () => {
    if (activeTab === 'camions') {
      downloadCsv(`camions_${today()}.csv`, [
        ['Immatriculation', 'Marque', 'Modèle', 'Capacité (kg)', 'Chauffeur', 'Téléphone', 'Statut'],
        ...filteredCamions.map((c) => [c.immatriculation, c.marque, c.modele, c.capacite, c.chauffeur, c.telephone, STATUTS_CAMION[c.statut]?.label || c.statut]),
      ]);
    } else {
      downloadCsv(`expeditions_${today()}.csv`, [
        ['Numéro', 'Camion', 'Poids (kg)', 'Destination', 'Montant (FCFA)', 'Date', 'Statut'],
        ...filteredExpeditions.map((e) => [
          e.numero,
          e.camion?.immatriculation,
          e.poids,
          e.destination,
          e.montant,
          formatDate(e.date),
          STATUTS_EXPEDITION[e.statut]?.label || e.statut,
        ]),
      ]);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {errorMsg && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Camions frigorifiques</h1>
          <p className="text-sm text-gray-600 mt-1">Gestion des transports et expéditions</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.tone}`}>
                  <i className={`${stat.icon} text-xl`}></i>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {([
              ['camions', 'Camions', 'ri-truck-line'],
              ['expeditions', 'Expéditions', 'ri-send-plane-line'],
            ] as const).map(([tab, label, icon]) => (
              <button
                key={tab}
                onClick={() => changeTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={icon}></i>
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statutFilter}
                onChange={(e) => setStatutFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(statuts).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {canManage && (
                <button
                  onClick={() => setModal({ type: activeTab === 'camions' ? 'camion' : 'expedition' })}
                  className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-add-line"></i>
                  {activeTab === 'camions' ? 'Nouveau camion' : 'Nouvelle expédition'}
                </button>
              )}
              <button
                onClick={exporter}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <i className="ri-download-line"></i>
                Exporter
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'camions' ? (
          <CamionsTable
            camions={filteredCamions}
            loading={loading}
            canManage={canDelete}
            onView={(item) => setModal({ type: 'detail-camion', item })}
            onDelete={supprimerCamion}
          />
        ) : (
          <ExpeditionsTable expeditions={filteredExpeditions} loading={loading} onView={(item) => setModal({ type: 'detail-expedition', item })} />
        )}
      </div>

      {modal?.type === 'camion' && <CamionModal onClose={() => setModal(null)} onSaved={afterChange} />}
      {modal?.type === 'expedition' && (
        <ExpeditionModal camionsActifs={camions.filter((c) => c.statut === 'ACTIF')} onClose={() => setModal(null)} onSaved={afterChange} />
      )}
      {modal?.type === 'detail-camion' && (
        <DetailModal kind="camion" item={modal.item} canManage={canManage} onClose={() => setModal(null)} onChanged={afterChange} />
      )}
      {modal?.type === 'detail-expedition' && (
        <DetailModal kind="expedition" item={modal.item} canManage={canManage} onClose={() => setModal(null)} onChanged={afterChange} />
      )}
    </DashboardLayout>
  );
}
