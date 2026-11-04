import { useEffect, useState } from 'react';
import { useYear } from '../../../contexts/YearContext';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../../components/feature/DashboardLayout';
import { getTaxCategories, getTransactions, getTaxServices, type TaxCategory, type TransactionItem, type TaxService } from '../../../services/taxes';
import RecuPDF from '../../../components/feature/RecuPDF';
import { getStoredUserRole } from '../../../services/auth';

export default function CategorieDetail() {
  const { categorieId } = useParams();
  const navigate = useNavigate();
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const userRole = getStoredUserRole() || 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [showRecuPDF, setShowRecuPDF] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
  const [categories, setCategories] = useState<TaxCategory[]>([]);
  const [services, setServices] = useState<TaxService[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const [catsData, txData] = await Promise.all([
          getTaxCategories(),
          getTransactions({ categorie: categorieId })
        ]);
        setCategories(catsData || []);
        setTransactions(txData?.data || []);
        
        // Charger les services de la catégorie
        if (categorieId) {
          try {
            const servicesData = await getTaxServices(categorieId);
            setServices(servicesData || []);
          } catch {
            // Services non disponibles pour cette catégorie
            setServices([]);
          }
        }
      } catch {
        setCategories([]);
        setTransactions([]);
        setServices([]);
        setErrorMsg("Impossible de charger les données de cette catégorie.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [categorieId]);

  const categorie = categories.find(c => c.id === categorieId);
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!categorie) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Catégorie non trouvée</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredTransactions = transactions.filter((t) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      t.contribuable?.nom?.toLowerCase().includes(searchLower) ||
      t.contribuable?.prenom?.toLowerCase().includes(searchLower) ||
      t.numero?.toLowerCase().includes(searchLower);

    const transactionDate = t.date ? new Date(t.date) : null;
    const dateKey = transactionDate && !Number.isNaN(transactionDate.getTime()) ? transactionDate.toISOString().slice(0, 10) : '';
    const matchesStartDate = !dateDebut || (dateKey && dateKey >= dateDebut);
    const matchesEndDate = !dateFin || (dateKey && dateKey <= dateFin);

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const totalRecettes = filteredTransactions.reduce((sum, t) => sum + (t.montant || 0), 0);

  const handleVoirRecu = (transaction: TransactionItem) => {
    setSelectedTransaction(transaction);
    setShowRecuPDF(true);
  };

  const handleVoirDetail = (transaction: TransactionItem) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
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
        <div>
          <button
            onClick={() => navigate('/taxes')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <i className="ri-arrow-left-line"></i>
            <span className="text-sm font-medium">Retour aux taxes</span>
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-teal-100 flex items-center justify-center">
              <i className="ri-file-list-3-line text-3xl text-teal-600"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{categorie.nom}</h1>
              <p className="text-sm text-gray-600">{categorie.description || ''}</p>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total recettes</p>
                <p className="text-2xl font-bold text-emerald-700">{totalRecettes.toLocaleString()} FCFA</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-xl text-emerald-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <i className="ri-file-list-3-line text-xl text-teal-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Services disponibles</p>
                <p className="text-2xl font-bold text-gray-900">{services.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                <i className="ri-service-line text-xl text-cyan-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Services et tarifs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <div key={service.id} className="p-4 border border-gray-200 rounded-lg hover:border-emerald-300 hover:shadow-sm transition-all">
                <h3 className="font-medium text-gray-900 mb-2">{service.nom}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-emerald-700">{service.tarif.toLocaleString()}</span>
                  <span className="text-sm text-gray-600">FCFA / {service.unite}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Historique des transactions</h2>
              {userRole !== 'super_admin' && isCurrentYear && (
                <button
                  onClick={() => navigate('/taxes/nouvelle-transaction', { state: { categorieId } })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-600/30 whitespace-nowrap"
                >
                  <i className="ri-add-line"></i>
                  Nouvelle transaction
                </button>
              )}
            </div>

            {/* Filtres */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                placeholder="Date début"
              />
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                placeholder="Date fin"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">N° Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date & Heure</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Contribuable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Quantité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">
                      Aucune transaction trouvée
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-emerald-700">{transaction.numero}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{transaction.date ? new Date(transaction.date).toLocaleDateString('fr-FR') : '-'}</div>
                        <div className="text-xs text-gray-500">{transaction.date ? new Date(transaction.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{transaction.service}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{transaction.contribuable?.prenom} {transaction.contribuable?.nom}</div>
                        <div className="text-xs text-gray-500">{transaction.contribuable?.nin}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.contribuable?.telephone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.quantite}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{transaction.montant?.toLocaleString()} FCFA</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.agent?.prenom} {transaction.agent?.nom}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => handleVoirRecu(transaction)}
                          className="text-emerald-600 hover:text-emerald-700 mr-3 cursor-pointer"
                          title="Télécharger reçu"
                        >
                          <i className="ri-file-download-line text-lg"></i>
                        </button>
                        <button 
                          onClick={() => handleVoirDetail(transaction)}
                          className="text-gray-600 hover:text-gray-700 cursor-pointer"
                          title="Voir détails"
                        >
                          <i className="ri-eye-line text-lg"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Reçu PDF */}
        {showRecuPDF && selectedTransaction && (
          <RecuPDF
            transaction={{
              numero: selectedTransaction.numero,
              date: selectedTransaction.date,
              heure: selectedTransaction.heure || (selectedTransaction.date ? new Date(selectedTransaction.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''),
              contribuable: `${selectedTransaction.contribuable?.prenom || ''} ${selectedTransaction.contribuable?.nom || ''}`.trim() || '-',
              type: selectedTransaction.service,
              montant: selectedTransaction.montant,
              agent: `${selectedTransaction.agent?.prenom || ''} ${selectedTransaction.agent?.nom || ''}`.trim() || '-',
              telephone: selectedTransaction.contribuable?.telephone || '',
              nin: selectedTransaction.contribuable?.nin || '',
              categorie: selectedTransaction.categorie || '',
              service: selectedTransaction.service || '',
              quantite: selectedTransaction.quantite,
              modePaiement: selectedTransaction.modePaiement || '',
              statut: selectedTransaction.statut || '',
            }}
            onClose={() => {
              setShowRecuPDF(false);
              setSelectedTransaction(null);
            }}
          />
        )}

        {/* Modal Détail Transaction */}
        {showDetailModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Détails de la transaction</h3>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedTransaction(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Numéro de transaction</p>
                    <p className="text-base font-semibold text-emerald-700">{selectedTransaction.numero}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Date et heure</p>
                    <p className="text-base font-medium text-gray-900">
                      {selectedTransaction.date ? new Date(selectedTransaction.date).toLocaleDateString('fr-FR') : '-'}
                      {' '}à{' '}
                      {selectedTransaction.date ? new Date(selectedTransaction.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Catégorie</p>
                    <p className="text-base font-medium text-gray-900">{selectedTransaction.categorie}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Service</p>
                    <p className="text-base font-medium text-gray-900">{selectedTransaction.service}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Contribuable</p>
                    <p className="text-base font-medium text-gray-900">{selectedTransaction.contribuable?.prenom} {selectedTransaction.contribuable?.nom}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">CNI</p>
                    <p className="text-base font-medium text-gray-900">{selectedTransaction.contribuable?.nin || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                    <p className="text-base font-medium text-gray-900">{selectedTransaction.contribuable?.telephone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Quantité</p>
                    <p className="text-base font-medium text-gray-900">{selectedTransaction.quantite}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Montant</p>
                    <p className="text-xl font-bold text-emerald-700">{selectedTransaction.montant.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Agent collecteur</p>
                    <p className="text-base font-medium text-gray-900">{selectedTransaction.agent?.prenom} {selectedTransaction.agent?.nom}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowRecuPDF(true);
                  }}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-printer-line mr-2"></i>
                  Imprimer le reçu
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedTransaction(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
