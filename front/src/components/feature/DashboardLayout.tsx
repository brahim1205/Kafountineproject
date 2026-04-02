import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useYear, AVAILABLE_YEARS } from '../../contexts/YearContext';
import NotificationPanel from './NotificationPanel';
import { logoutRequest, clearSession, getStoredUserInitials, getStoredUserName, getStoredUserRole } from '../../services/auth';
import { listContribuables, type Contribuable } from '../../services/contribuables';
import { getTransactions, type TransactionItem } from '../../services/taxes';
import { listNotifications } from '../../services/notifications';

type UserRole = 'admin' | 'super_admin' | 'agent' | 'comptable' | 'service_finances' | 'quai_peche';

const allMenuItems = [
  { path: '/dashboard', icon: 'ri-dashboard-line', label: 'Tableau de bord', roles: ['admin', 'super_admin', 'agent', 'comptable', 'service_finances', 'quai_peche'] },
  { path: '/quai-peche', icon: 'ri-ship-line', label: 'Quai de Pêche', roles: ['quai_peche'] },
  { path: '/quai-peche/commissions', icon: 'ri-snowy-line', label: 'Commissions Frigorifiques', roles: ['quai_peche'] },
  { path: '/quai-peche/pecheurs', icon: 'ri-user-line', label: 'Pêcheurs', roles: ['quai_peche'] },
  { path: '/quai-peche/embarcations', icon: 'ri-ship-2-line', label: 'Embarcations', roles: ['quai_peche'] },
  { path: '/quai-peche/camions', icon: 'ri-truck-line', label: 'Camions Frigorifiques', roles: ['quai_peche'] },
  { path: '/motos', icon: 'ri-motorbike-line', label: 'Motos Jakarta', roles: ['quai_peche'] },
  { path: '/marche', icon: 'ri-store-2-line', label: 'Marché', roles: ['quai_peche'] },
  { path: '/contribuables', icon: 'ri-user-line', label: 'Contribuables', roles: ['admin', 'super_admin', 'agent', 'comptable'] },
  { path: '/recettes', icon: 'ri-money-dollar-circle-line', label: 'Recettes', roles: ['admin', 'super_admin', 'agent', 'comptable', 'service_finances'] },
  { path: '/taxes', icon: 'ri-file-list-3-line', label: 'Taxes', roles: ['admin', 'super_admin', 'agent', 'comptable'] },
  { path: '/formations', icon: 'ri-graduation-cap-line', label: 'Formations', roles: ['admin', 'super_admin', 'agent'] },
  { path: '/etat-civil', icon: 'ri-file-text-line', label: 'État Civil', roles: ['admin', 'super_admin', 'agent'] },
  { path: '/urbanisme', icon: 'ri-building-line', label: 'Urbanisme', roles: ['admin', 'super_admin', 'agent'] },
  { path: '/marche', icon: 'ri-store-2-line', label: 'Marché', roles: ['admin', 'super_admin', 'agent', 'comptable'] },
  { path: '/motos', icon: 'ri-motorbike-line', label: 'Motos', roles: ['admin', 'super_admin', 'agent', 'comptable'] },
  { path: '/utilisateurs', icon: 'ri-team-line', label: 'Utilisateurs', roles: ['admin', 'super_admin'] },
  { path: '/budget-suivi', icon: 'ri-wallet-3-line', label: 'Suivi Budgétaire', roles: ['comptable', 'service_finances'] },
  { path: '/gestion-budget', icon: 'ri-money-dollar-circle-line', label: 'Gestion Budget', roles: ['service_finances'] },
  { path: '/rapports', icon: 'ri-bar-chart-box-line', label: 'Rapports', roles: ['admin', 'super_admin'] },
  { path: '/audit', icon: 'ri-file-list-3-line', label: 'Journal Audit', roles: ['super_admin'] },
];

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrateur',
  super_admin: 'Super Administrateur',
  agent: 'Agent municipal',
  comptable: 'Comptable',
  service_finances: 'Service des Finances',
  quai_peche: 'Quai de Pêche'
};

interface SearchResult {
  id: string;
  type: 'contribuable' | 'recette' | 'taxe';
  title: string;
  subtitle: string;
  icon: string;
  link: string;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Use year context
  const { selectedYear, setSelectedYear } = useYear();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchContribuables, setSearchContribuables] = useState<Contribuable[]>([]);
  const [searchTransactions, setSearchTransactions] = useState<TransactionItem[]>([]);
  const [notificationsNonLues, setNotificationsNonLues] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = (getStoredUserRole() || 'admin') as UserRole;
  const storedUserName = getStoredUserName();
  // Afficher "Mr le Maire" seulement pour l'admin, sinon utiliser le nom stored
  const userName = userRole === 'admin' ? 'Mr le Maire' : storedUserName;
  const userInitials = userRole === 'admin' ? 'MR' : (getStoredUserInitials() || storedUserName.split(' ').map((n: string) => n[0]).join('').toUpperCase());
  const authToken = Boolean(getStoredUserRole());

  const menuItems = useMemo(() => {
    return allMenuItems.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  useEffect(() => {
    // Skip if no auth token (user logged out)
    if (!authToken) return;
    
    let mounted = true;
    Promise.all([listContribuables({ limit: 100 }), getTransactions({ page: 1, limit: 300 })])
      .then(([contribuables, transactions]) => {
        if (!mounted) return;
        setSearchContribuables(contribuables || []);
        setSearchTransactions(transactions.data || []);
      })
      .catch(() => {
        if (!mounted) return;
        setSearchContribuables([]);
        setSearchTransactions([]);
      });
    return () => {
      mounted = false;
    };
  }, [authToken]);

  useEffect(() => {
    // Skip if no auth token (user logged out)
    if (!authToken) return;
    
    listNotifications({ year: selectedYear })
      .then((data) => {
        setNotificationsNonLues((data || []).filter((n) => !n.lu).length);
      })
      .catch(() => {
        setNotificationsNonLues(0);
      });
  }, [authToken, showNotifications, selectedYear]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Ignore API logout errors and clear local session anyway.
    }

    clearSession();
    
    // Force redirect to login
    window.location.href = '/login';
  };

  // Recherche globale
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Recherche dans les contribuables
    searchContribuables.forEach(contrib => {
      const fullName = `${contrib.prenom || ''} ${contrib.nom || ''}`.trim();
      if (
        fullName.toLowerCase().includes(query) ||
        contrib.id.toLowerCase().includes(query) ||
        String(contrib.telephone || '').includes(query) ||
        String(contrib.zone || '').toLowerCase().includes(query)
      ) {
        results.push({
          id: contrib.id,
          type: 'contribuable',
          title: fullName || contrib.id,
          subtitle: `${contrib.nin || contrib.id} • ${contrib.zone || '-'}`,
          icon: 'ri-user-line',
          link: '/contribuables'
        });
      }
    });

    // Recherche dans les transactions taxes
    searchTransactions.forEach(taxe => {
      const contribuable = `${taxe.contribuable?.prenom || ''} ${taxe.contribuable?.nom || ''}`.trim();
      if (
        String(taxe.numero || '').toLowerCase().includes(query) ||
        contribuable.toLowerCase().includes(query) ||
        String(taxe.service || '').toLowerCase().includes(query) ||
        String(taxe.categorie || '').toLowerCase().includes(query)
      ) {
        results.push({
          id: String(taxe.id || taxe.numero),
          type: 'recette',
          title: String(taxe.numero || '-'),
          subtitle: `${contribuable || '-'} • ${taxe.service} • ${Number(taxe.montant || 0).toLocaleString()} FCFA`,
          icon: 'ri-file-list-3-line',
          link: '/recettes'
        });
      }
    });

    setSearchResults(results.slice(0, 8)); // Limiter à 8 résultats
    setShowSearchDropdown(results.length > 0);
  }, [searchQuery, searchContribuables, searchTransactions]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fermer le dropdown avec Échap
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowSearchDropdown(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSearchResultClick = (link: string) => {
    navigate(link);
    setShowSearchDropdown(false);
    setSearchQuery('');
  };

  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case 'contribuable': return 'Contribuable';
      case 'recette': return 'Recette';
      case 'taxe': return 'Transaction Taxe';
      default: return '';
    }
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'contribuable': return 'bg-teal-100 text-teal-700';
      case 'recette': return 'bg-cyan-100 text-cyan-700';
      case 'taxe': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
        isSidebarOpen ? 'w-64' : 'w-20'
      }`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <i className="ri-government-line text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">Kafountine</h1>
                <p className="text-xs text-gray-600">Gestion Municipale</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto">
              <i className="ri-government-line text-white text-xl"></i>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-1" style={{ height: 'calc(100vh - 64px)' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${!isSidebarOpen && 'justify-center'}`}
                title={!isSidebarOpen ? item.label : ''}
              >
                <i className={`${item.icon} text-xl flex-shrink-0`}></i>
                {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className={`min-w-0 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <i className={`${isSidebarOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'} text-xl`}></i>
            </button>

            {/* Recherche globale */}
            <div className="relative flex-1 max-w-xl min-w-0" ref={searchRef}>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Rechercher un contribuable, une transaction..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Dropdown des résultats */}
              {showSearchDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 z-50">
                  {searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSearchResultClick(result.link)}
                          className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-start gap-3"
                        >
                          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i className={`${result.icon} text-teal-600 text-lg`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">{result.title}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getResultTypeColor(result.type)}`}>
                                {getResultTypeLabel(result.type)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                          </div>
                          <i className="ri-arrow-right-line text-gray-400 flex-shrink-0 mt-2"></i>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <i className="ri-search-line text-4xl text-gray-300 mb-2"></i>
                      <p className="text-sm text-gray-500">Aucun résultat trouvé</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors relative cursor-pointer"
              >
                <i className="ri-notification-3-line text-xl text-gray-600"></i>
                {notificationsNonLues > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                    {notificationsNonLues > 9 ? '9+' : notificationsNonLues}
                  </span>
                )}
              </button>
              <NotificationPanel 
                isOpen={showNotifications} 
                onClose={() => setShowNotifications(false)} 
              />
            </div>

            {/* Sélecteur d'année */}
            <div className="flex items-center gap-2">
              <i className="ri-calendar-line text-gray-500"></i>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                {AVAILABLE_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${
                  userRole === 'admin' ? 'bg-teal-100 text-teal-700' :
                  userRole === 'agent' ? 'bg-amber-100 text-amber-700' :
                  userRole === 'service_finances' ? 'bg-emerald-100 text-emerald-700' :
                  userRole === 'comptable' ? 'bg-cyan-100 text-cyan-700' :
                  'bg-sky-100 text-sky-700'
                }`}>
                  {userInitials}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-600">{roleLabels[userRole]}</p>
                </div>
                <i className="ri-arrow-down-s-line text-gray-600"></i>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      to="/profil"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <i className="ri-user-line text-lg"></i>
                      Mon profil
                    </Link>
                    <Link
                      to="/audit"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <i className="ri-file-list-3-line text-lg"></i>
                      Journal Audit
                    </Link>
                    <hr className="my-2 border-gray-200" />
                    <button
                      onClick={() => void handleLogout()}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <i className="ri-logout-box-line text-lg"></i>
                      Déconnexion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
