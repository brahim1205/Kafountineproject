import { useState, useEffect } from 'react';
import { useYear } from '../../../contexts/YearContext';
import { listCommissions, listPecheurs, listEmbarcations, validateCommission, getQuaiPecheStats, type Commission, type Pecheur, type Embarcation, type QuaiPecheStats } from '../../../services/quai-peche';
import { listMotos, type Moto } from '../../../services/motos';
import { listPlacesMarche, type PlaceMarche } from '../../../services/marche';
import { getStoredUserName } from '../../../services/auth';

function normalizeStatus(value?: string | null): string {
  return String(value || '').trim().toUpperCase();
}

function displayStatus(value?: string | null): string {
  const normalized = normalizeStatus(value);
  switch (normalized) {
    case 'ENREGISTREE':
      return 'Enregistrée';
    case 'VALIDEE':
      return 'Validée';
    case 'ACTIF':
      return 'Actif';
    case 'INACTIF':
      return 'Inactif';
    case 'EN_MAINTENANCE':
      return 'En maintenance';
    case 'OCCUPEE':
      return 'Occupée';
    case 'DISPONIBLE':
      return 'Libre';
    default:
      return value || 'Inconnu';
  }
}

type DashboardMarketPlace = PlaceMarche & {
  occupantName: string;
};

export default function QuaiPecheDashboard() {
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  
  const [activeTab, setActiveTab] = useState<'commissions' | 'pecheurs' | 'embarcations' | 'motos' | 'marche'>('commissions');
  const userName = getStoredUserName() || 'Responsable Quai';
  
  // Données Quai de Pêche
  const [pecheurs, setPecheurs] = useState<Pecheur[]>([]);
  const [embarcations, setEmbarcations] = useState<Embarcation[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [quaiStats, setQuaiStats] = useState<QuaiPecheStats | null>(null);
  
  // Données Motos Jakarta
  const [motos, setMotos] = useState<Moto[]>([]);
  
  // Données Marché
  const [placesMarche, setPlacesMarche] = useState<DashboardMarketPlace[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');

  // Charger les données depuis l'API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        
        // Charger données Quai de Pêche
        const [pecheursData, embarcationsData, commissionsData, quaiStatsData] = await Promise.all([
          listPecheurs({ year: selectedYear }),
          listEmbarcations({ year: selectedYear }),
          listCommissions({ year: selectedYear }),
          getQuaiPecheStats(selectedYear),
        ]);
        setPecheurs(pecheursData || []);
        setEmbarcations(embarcationsData || []);
        setCommissions(commissionsData || []);
        setQuaiStats(quaiStatsData || null);
        
        // Charger données Motos Jakarta
        const motosData = await listMotos(selectedYear);
        setMotos(motosData || []);
        
        // Charger données Marché
        const placesData = await listPlacesMarche(selectedYear);
        setPlacesMarche((placesData || []).map((place) => ({
          ...place,
          occupantName: typeof place.occupant === 'string' ? place.occupant : '-',
        })));
        
      } catch {
        setPecheurs([]);
        setEmbarcations([]);
        setCommissions([]);
        setQuaiStats(null);
        setMotos([]);
        setPlacesMarche([]);
        setErrorMsg("Impossible de charger les données du quai de pêche.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedYear]);

  // Statistiques Quai de Pêche
  const totalCommissions = quaiStats?.totalCommissions ?? commissions.length;
  const totalPoids = quaiStats?.totalPoids ?? commissions.reduce((sum, c) => sum + (c.poids || 0), 0);
  const commissionsEnAttente = quaiStats?.commissionsEnAttente ?? commissions.filter((c) => normalizeStatus(c.statut) === 'ENREGISTREE').length;
  const totalPecheurs = quaiStats?.totalPecheurs ?? pecheurs.filter((p) => normalizeStatus(p.statut) === 'ACTIF').length;

  // Filtrage
  const filteredCommissions = commissions.filter(c => {
    const matchSearch = (c.numero || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (c.pecheur?.nom || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = statutFilter === 'all' || normalizeStatus(c.statut) === statutFilter;
    return matchSearch && matchStatut;
  });

  const filteredPecheurs = pecheurs.filter(p => {
    const matchSearch = (p.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (p.prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.telephone || '').includes(searchTerm);
    const matchStatut = statutFilter === 'all' || normalizeStatus(p.statut) === statutFilter;
    return matchSearch && matchStatut;
  });

  const filteredEmbarcations = embarcations.filter(e => {
    const matchSearch = (e.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (e.immatriculation || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = statutFilter === 'all' || normalizeStatus(e.statut) === statutFilter;
    return matchSearch && matchStatut;
  });

  const filteredMotos = Array.isArray(motos) ? motos.filter((m) => {
    const matchSearch = (m.matricule || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (`${m.proprietaire?.prenom || ''} ${m.proprietaire?.nom || ''}`.trim().toLowerCase()).includes(searchTerm.toLowerCase()) ||
                        (m.marque || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = statutFilter === 'all' || normalizeStatus(m.statut) === statutFilter;
    return matchSearch && matchStatut;
  }) : [];

  const filteredPlacesMarche = Array.isArray(placesMarche) ? placesMarche.filter((p) => {
    const matchSearch = (p.numeroPlace || p.numero || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.occupantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.zone || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = statutFilter === 'all' || normalizeStatus(p.statut) === statutFilter;
    return matchSearch && matchStatut;
  }) : [];

  const handleValidate = async (id: string) => {
    if (!isCurrentYear) return;
    try {
      await validateCommission(id);
      setCommissions(commissions.map(c => 
        c.id === id ? { ...c, statut: 'VALIDEE' } : c
      ));
    } catch {
      setErrorMsg("Impossible de valider la commission.");
    }
  };

  const tabs = [
    { id: 'commissions', label: 'Commissions', icon: 'ri-snowy-line' },
    { id: 'pecheurs', label: 'Pêcheurs', icon: 'ri-user-line' },
    { id: 'embarcations', label: 'Embarcations', icon: 'ri-ship-line' },
    { id: 'motos', label: 'Motos Jakarta', icon: 'ri-motorbike-line' },
    { id: 'marche', label: 'Marché', icon: 'ri-store-2-line' },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {userName.split(' ')[0]} — Quai de Pêche 👋</h1>
          <p className="text-sm text-gray-600 mt-1">Gestion du quai de pêche, motos et marché</p>
        </div>
        {/* Badge année passée - lecture seule */}
        {!isCurrentYear && (
          <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg flex items-center gap-2">
            <i className="ri-eye-line"></i>
            <span className="text-sm font-medium">Année {selectedYear} - Consultation seule</span>
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quai de Pêche */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Commissions</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalCommissions}</h3>
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
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
              <i className="ri-scales-line text-xl text-teal-600"></i>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pêcheurs Actifs</p>
              <h3 className="text-2xl font-bold text-green-600 mt-1">{totalPecheurs}</h3>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <i className="ri-group-line text-xl text-green-600"></i>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Attente</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{commissionsEnAttente}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <i className="ri-time-line text-xl text-amber-600"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </nav>
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
              <option value="ACTIF">Actif</option>
              <option value="INACTIF">Inactif</option>
              <option value="ENREGISTREE">Enregistrée</option>
              <option value="VALIDEE">Validée</option>
              <option value="OCCUPEE">Occupée</option>
              <option value="DISPONIBLE">Libre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {activeTab === 'commissions' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">N° Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Pêcheur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Poids (kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type Poisson</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Température</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Statut</th>
                    {isCurrentYear && <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>}
                  </>
                )}
                {activeTab === 'pecheurs' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Prénom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Téléphone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">NIN</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Statut</th>
                    {isCurrentYear && <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>}
                  </>
                )}
                {activeTab === 'embarcations' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Immatriculation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Taille</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Statut</th>
                    {isCurrentYear && <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>}
                  </>
                )}
                {activeTab === 'motos' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Matricule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Marque</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Modèle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Propriétaire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Téléphone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Statut</th>
                  </>
                )}
                {activeTab === 'marche' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">N° Place</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Zone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Occupant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Activité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Statut</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeTab === 'commissions' && filteredCommissions.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.numero}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.pecheur?.nom || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.poids}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.typePoisson}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.temperatura}°C</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      normalizeStatus(item.statut) === 'VALIDEE' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {displayStatus(item.statut)}
                    </span>
                  </td>
                  {isCurrentYear && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {normalizeStatus(item.statut) === 'ENREGISTREE' && (
                          <button
                            onClick={() => handleValidate(item.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Valider"
                          >
                            <i className="ri-check-line"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {activeTab === 'pecheurs' && filteredPecheurs.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.nom}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.prenom}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.telephone}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.nin}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      normalizeStatus(item.statut) === 'ACTIF' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {displayStatus(item.statut)}
                    </span>
                  </td>
                  {isCurrentYear && (
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Voir">
                        <i className="ri-eye-line"></i>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {activeTab === 'embarcations' && filteredEmbarcations.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.nom}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-mono">{item.immatriculation}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.taille || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      normalizeStatus(item.statut) === 'ACTIF' ? 'bg-green-50 text-green-700' : 
                      normalizeStatus(item.statut) === 'EN_MAINTENANCE' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {displayStatus(item.statut)}
                    </span>
                  </td>
                  {isCurrentYear && (
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Voir">
                        <i className="ri-eye-line"></i>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {activeTab === 'motos' && filteredMotos.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">{item.matricule}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.marque || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.modele || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{`${item.proprietaire?.prenom || ''} ${item.proprietaire?.nom || ''}`.trim() || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.proprietaire?.nin || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      normalizeStatus(item.statut) === 'ACTIF' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {displayStatus(item.statut)}
                    </span>
                  </td>
                </tr>
              ))}
              {activeTab === 'marche' && filteredPlacesMarche.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.numeroPlace || item.numero}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.zone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.type || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.occupantName}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.activite || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      normalizeStatus(item.statut) === 'OCCUPEE' ? 'bg-green-50 text-green-700' : 
                      normalizeStatus(item.statut) === 'DISPONIBLE' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {displayStatus(item.statut)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
