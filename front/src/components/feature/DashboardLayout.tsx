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
  { path: '/penalites', icon: 'ri-alert-line', label: 'Pénalités', roles: ['admin', 'super_admin', 'agent', 'comptable'] },
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

const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    // Un son doux, agréable et premium ("Ping")
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Note La (A5)
    oscillator.frequency.exponentialRampToValueAtTime(1318.51, audioCtx.currentTime + 0.1); // Glissement vers Mi (E6)
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.02); // Fade in très rapide
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4); // Fade out progressif
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch {
    // Lecture audio bloquée par le navigateur
  }
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Use year context
  const { selectedYear, setSelectedYear } = useYear();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 768);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchContribuables, setSearchContribuables] = useState<Contribuable[]>([]);
  const [searchTransactions, setSearchTransactions] = useState<TransactionItem[]>([]);
  const [notificationsNonLues, setNotificationsNonLues] = useState(0);
  const prevNotifsRef = useRef<number>(0);
  const isInitialLoadRef = useRef<boolean>(true);
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
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const handleViewportChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobileViewport(event.matches);
    };

    handleViewportChange(mediaQuery);
    const listener = (event: MediaQueryListEvent) => handleViewportChange(event);
    mediaQuery.addEventListener('change', listener);

    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
    setShowNotifications(false);
    setShowUserMenu(false);
    setShowSearchDropdown(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileViewport || !isMobileSidebarOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen, isMobileViewport]);

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
        const unreadCount = (data || []).filter((n) => !n.lu).length;
        
        // Jouer le son et vibrer uniquement si c'est une nouvelle notification (pas au chargement initial)
        if (!isInitialLoadRef.current && unreadCount > prevNotifsRef.current) {
          playNotificationSound();
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]); // Vibre 200ms, pause 100ms, vibre 200ms
          }
        }
        
        setNotificationsNonLues(unreadCount);
        prevNotifsRef.current = unreadCount;
        isInitialLoadRef.current = false;
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

  const renderSidebarContent = (expanded: boolean, mobile = false) => (
    <>
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {expanded ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 overflow-hidden">
              <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Kafountine</h1>
              <p className="text-xs text-gray-600">Gestion Municipale</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 overflow-hidden">
            <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain p-0.5" />
          </div>
        )}

        {mobile ? (
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        ) : null}
      </div>

      <nav className="space-y-1 overflow-y-auto p-4" style={{ height: 'calc(100vh - 64px)' }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={`${mobile ? 'mobile' : 'desktop'}-${item.path}`}
              to={item.path}
              onClick={() => {
                if (mobile) setIsMobileSidebarOpen(false);
              }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-700 hover:bg-gray-100'
              } ${!expanded ? 'justify-center' : ''}`}
              title={!expanded ? item.label : ''}
            >
              <i className={`${item.icon} flex-shrink-0 text-xl`}></i>
              {expanded ? <span className="text-sm font-medium">{item.label}</span> : null}
            </Link>
          );
        })}

        {/* Version Badge */}
        <div className={`mt-8 pt-4 border-t border-gray-100 ${!expanded ? 'text-center' : 'px-3'}`}>
          <div className={`inline-flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md border border-gray-100 ${!expanded ? 'justify-center' : ''}`}>
            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></div>
            {expanded && (
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Version 2.0.0</span>
            )}
            {!expanded && (
              <span className="text-[10px] font-black text-gray-400">V2</span>
            )}
          </div>
        </div>
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobileSidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-gray-200 bg-white transition-transform duration-300 md:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent(true, true)}
      </aside>

      <aside
        className={`fixed top-0 left-0 hidden h-full border-r border-gray-200 bg-white transition-all duration-300 md:block ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {renderSidebarContent(isSidebarOpen)}
      </aside>

      {/* Main content */}
      <div className={`min-w-0 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={() => {
                if (isMobileViewport) {
                  setIsMobileSidebarOpen(true);
                  return;
                }

                setIsSidebarOpen(!isSidebarOpen);
              }}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
            >
              <i className={`${isMobileViewport || isSidebarOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'} text-xl`}></i>
            </button>

            {/* Recherche globale */}
            <div className="relative order-3 w-full min-w-0 md:order-none md:max-w-xl" ref={searchRef}>
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
                <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
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

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 cursor-pointer"
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
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500">
              <i className="ri-calendar-line text-gray-500"></i>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="cursor-pointer border-none bg-transparent text-sm font-medium text-gray-700 outline-none focus:ring-0"
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
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-gray-100 cursor-pointer sm:gap-3 sm:px-3"
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
                <div className="hidden text-left sm:block">
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
                      type="button"
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
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
