import { useState, useEffect } from 'react';
import { useYear } from '../../../contexts/YearContext';
import Pagination from '../../../components/feature/Pagination';
import { fetchAllPages, useServerList } from '../../../hooks/useServerList';
import CommissionFormModal from './components/CommissionFormModal';
import CommissionDetailModal from './components/CommissionDetailModal';
import DashboardLayout from '../../../components/feature/DashboardLayout';
import { validateCommission, createCommission, type Commission, type Pecheur, pageCommissions } from '../../../services/quai-peche';
import { listPecheurs } from '../../../services/quai-peche';
import {
  validateFormElement,
} from '../../../utils/formValidation';
import { downloadCsv, today } from '../../../utils/csv';

export default function CommissionsPage() {
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const [pecheurs, setPecheurs] = useState<Pecheur[]>([]);
  const [actionError, setErrorMsg] = useState('');
  const list = useServerList<Commission>((query) => pageCommissions({ year: selectedYear, ...query }), [selectedYear]);
  const { items: commissions, loading, reload: loadData, yearTotal, counts } = list;
  const errorMsg = actionError || list.error;
  const searchTerm = list.search;
  const setSearchTerm = list.setSearch;
  const statutFilter = list.statut;
  const setStatutFilter = list.setStatut;
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  
  // Form
  const [formData, setFormData] = useState({
    pecheurId: '',
    poids: '',
    typePoisson: 'Maquereau',
    temperatura: '',
    observations: ''
  });


  const filteredCommissions = commissions;

  // La liste des pêcheurs n'est chargée qu'à l'ouverture du formulaire.
  useEffect(() => {
    if ((showModal) && pecheurs.length === 0) {
      listPecheurs({ year: selectedYear }).then(setPecheurs).catch(() => setErrorMsg('Impossible de charger les pêcheurs.'));
    }
  }, [showModal, selectedYear, pecheurs.length]);

  const totalPoids = list.meta.somme || 0;
  const enAttente = counts.ENREGISTREE || 0;

  const handleValidate = async (id: string) => {
    try {
      setErrorMsg('');
      await validateCommission(id);
      list.setItems(commissions.map(c => 
        c.id === id ? { ...c, statut: 'VALIDEE' } : c
      ));
    } catch {
      setErrorMsg("Impossible de valider la commission.");
    }
  };

  const handleView = (commission: Commission) => {
    setSelectedCommission(commission);
    setShowViewModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
      return;
    }
    try {
      setErrorMsg('');
      await createCommission({
        pecheurId: formData.pecheurId,
        poids: parseFloat(formData.poids),
        typePoisson: formData.typePoisson,
        temperatura: formData.temperatura ? parseFloat(formData.temperatura) : undefined,
        observations: formData.observations || undefined
      });
      setShowModal(false);
      setFormData({ pecheurId: '', poids: '', typePoisson: 'Maquereau', temperatura: '', observations: '' });
      loadData();
    } catch {
      setErrorMsg("Impossible de créer la commission.");
    }
  };

  const handleExport = async () => {
    const rows = await fetchAllPages((page, limit) => pageCommissions({ year: selectedYear, page, limit, search: list.appliedSearch, statut: list.statutValue }));
    const data = [
      ['Numéro', 'Pêcheur', 'Poids (kg)', 'Type', 'Température', 'Date', 'Statut'],
      ...rows.map(c => [
        c.numero, 
        `${c.pecheur?.prenom || ''} ${c.pecheur?.nom || ''}`, 
        String(c.poids), 
        c.typePoisson, 
        c.temperatura ? `${c.temperatura}°C` : '-',
        new Date(c.date).toLocaleDateString('fr-FR'),
        c.statut
      ])
    ];
    downloadCsv(`commissions_${today()}.csv`, data);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Commissions Frigorifiques</h1>
            <p className="text-sm text-gray-600 mt-1">Gestion des commissions du quai de pêche</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Commissions</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{yearTotal}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="ri-snowy-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Poids Total (kg)</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalPoids.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <i className="ri-scales-line text-xl text-emerald-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Attente</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{enAttente}</h3>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <i className="ri-time-line text-xl text-amber-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et Actions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statutFilter}
                onChange={(e) => setStatutFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="ENREGISTREE">Enregistrée</option>
                <option value="VALIDEE">Validée</option>
                <option value="REJETEE">Rejetée</option>
              </select>
              {
isCurrentYear && (
                <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <i className="ri-add-line"></i>
                Nouveau
              </button>
              )}
              {
isCurrentYear && (
                <button
                onClick={handleExport}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <i className="ri-download-line"></i>
                Exporter
              </button>
              )}
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">N° Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Pêcheur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Poids (kg)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type Poisson</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Température</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Chargement...</td>
                  </tr>
                ) : filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Aucune commission trouvée</td>
                  </tr>
                ) : (
                  filteredCommissions.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.numero}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.pecheur?.prenom} {item.pecheur?.nom}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.poids}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.typePoisson}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.temperatura ? `${item.temperatura}°C` : '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.statut === 'VALIDEE' ? 'bg-green-50 text-green-700' : 
                          item.statut === 'ENREGISTREE' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {item.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.statut === 'ENREGISTREE' && isCurrentYear && (
                            <button
                              onClick={() => handleValidate(item.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Valider"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                          )}
                          {isCurrentYear && (
                            <button
                              onClick={() => handleView(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Voir"
                            >
                            <i className="ri-eye-line"></i>
                          </button>
              )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.meta.total} unit="commission" onChange={list.setPage} />
        </div>
      </div>

      {showModal && <CommissionFormModal formData={formData} setFormData={setFormData} onSubmit={handleSubmit} onClose={() => setShowModal(false)} pecheurs={pecheurs} />}
      {showViewModal && selectedCommission && <CommissionDetailModal item={selectedCommission} onClose={() => setShowViewModal(false)} />}
    </DashboardLayout>
  );
}
