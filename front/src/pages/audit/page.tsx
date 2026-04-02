import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { useYear } from '../../contexts/YearContext';
import { getAuditLogs, exportAuditLogs } from '../../services/audit';

interface AuditLog {
  id: string;
  date: string;
  time: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  status: 'success' | 'warning' | 'error';
}

export default function Audit() {
  const { selectedYear } = useYear();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, warning: 0, error: 0 });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const data = await getAuditLogs({ 
          year: selectedYear,
          search: searchTerm || undefined,
          module: filterModule,
          statut: filterStatus
        });
        
        if (data?.logs) {
          setAuditLogs(data.logs);
          setStats(data.stats);
        }
      } catch {
        setAuditLogs([]);
        setStats({ total: 0, success: 0, warning: 0, error: 0 });
        setErrorMsg("Impossible de charger le journal d'audit.");
      } finally {
        setLoading(false);
      }
    };
    
    loadAuditLogs();
  }, [selectedYear, filterModule, filterStatus]);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = filterModule === 'all' || log.module === filterModule;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    return matchesSearch && matchesModule && matchesStatus;
  });

  const handleExport = async () => {
    try {
      const blob = await exportAuditLogs(selectedYear);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-audit-${selectedYear}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Impossible d'exporter le journal d'audit.");
    }
  };

  const openDetailModal = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700"><i className="ri-check-line mr-1"></i>Succès</span>;
      case 'warning':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700"><i className="ri-alert-line mr-1"></i>Avertissement</span>;
      case 'error':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700"><i className="ri-close-line mr-1"></i>Erreur</span>;
      default:
        return null;
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Journal d'audit</h1>
            <p className="text-sm text-gray-600 mt-1">Traçabilité complète de toutes les opérations système - Année {selectedYear}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <i className="ri-download-line"></i>
              Exporter le journal
            </button>
          </div>
        </div>

        {/* Message de succès */}
        {showSuccessMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <i className="ri-check-circle-fill text-green-600 text-xl"></i>
            <div>
              <p className="text-sm font-medium text-gray-900">Export réussi !</p>
              <p className="text-xs text-gray-600">Le journal d'audit a été téléchargé</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <i className="ri-file-list-line text-gray-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total actions</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <i className="ri-check-line text-green-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.success}</p>
                <p className="text-xs text-gray-500">Succès</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <i className="ri-alert-line text-yellow-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.warning}</p>
                <p className="text-xs text-gray-500">Avertissements</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <i className="ri-close-line text-red-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.error}</p>
                <p className="text-xs text-gray-500">Erreurs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="all">Tous les modules</option>
              <option value="Recettes">Recettes</option>
              <option value="Taxes">Taxes</option>
              <option value="Urbanisme">Urbanisme</option>
              <option value="Motos">Motos</option>
              <option value="Utilisateurs">Utilisateurs</option>
              <option value="Dashboard">Dashboard</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="success">Succès</option>
              <option value="warning">Avertissement</option>
              <option value="error">Erreur</option>
            </select>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-gray-600 uppercase tracking-wider whitespace-nowrap">Date & Heure</th>
                    <th className="px-6 py-3 text-left text-xs font-medium-xs font-medium text text-gray-600 uppercase tracking-wider whitespace-nowrap">Utilisateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Module</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Détails</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span>{log.date}</span>
                          <span className="text-gray-500">{log.time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-xs">
                            {log.user.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.user}</p>
                            <p className="text-xs text-gray-500">{log.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.action}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{log.module}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{log.details}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(log.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openDetailModal(log)}
                          className="text-teal-600 hover:text-teal-700"
                        >
                          <i className="ri-eye-line text-lg"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination info */}
          {!loading && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Affichage de {filteredLogs.length} sur {auditLogs.length} entrées
              </p>
            </div>
          )}
        </div>

        {/* Modal détails */}
        {showDetailModal && selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Détails de l'entrée d'audit</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm font-medium text-gray-900">{selectedLog.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Heure</p>
                    <p className="text-sm font-medium text-gray-900">{selectedLog.time}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Utilisateur</p>
                    <p className="text-sm font-medium text-gray-900">{selectedLog.user}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rôle</p>
                    <p className="text-sm font-medium text-gray-900">{selectedLog.role}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Action</p>
                    <p className="text-sm font-medium text-gray-900">{selectedLog.action}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Module</p>
                    <p className="text-sm font-medium text-gray-900">{selectedLog.module}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Détails</p>
                  <p className="text-sm font-medium text-gray-900">{selectedLog.details}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Adresse IP</p>
                  <p className="text-sm font-medium text-gray-900">{selectedLog.ipAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  {getStatusBadge(selectedLog.status)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
