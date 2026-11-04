import { lazy, type ReactNode, useEffect, useState } from 'react';
import { RouteObject, Navigate } from 'react-router-dom';
import { getStoredUserRole, restoreSession, type UiRole } from '../services/auth';
import { restorePortalSession } from '../services/portalAuth';

const LoginPage = lazy(() => import('../pages/login/page'));
const DashboardPage = lazy(() => import('../pages/dashboard/page'));
const ServiceFinancesDashboard = lazy(() => import('../pages/dashboard/components/ServiceFinancesDashboard'));
const GestionBudgetPage = lazy(() => import('../pages/gestion-budget/page'));
const QuaiPechePage = lazy(() => import('../pages/quai-peche/page'));
const CommissionsPage = lazy(() => import('../pages/quai-peche/commissions/page'));
const PecheursPage = lazy(() => import('../pages/quai-peche/pecheurs/page'));
const EmbarcationsPage = lazy(() => import('../pages/quai-peche/embarcations/page'));
const CamionsPage = lazy(() => import('../pages/quai-peche/camions/page'));
const ContribuablesPage = lazy(() => import('../pages/contribuables/page'));
const RecettesPage = lazy(() => import('../pages/recettes/page'));
const TaxesPage = lazy(() => import('../pages/taxes/page'));
const CategorieDetail = lazy(() => import('../pages/taxes/components/CategorieDetail'));
const NouvelleTransaction = lazy(() => import('../pages/taxes/components/NouvelleTransaction'));
const MotosPage = lazy(() => import('../pages/motos/page'));
const FormationsPage = lazy(() => import('../pages/formations/page'));
const PenalitesPage = lazy(() => import('../pages/penalites/page'));
const UtilisateursPage = lazy(() => import('../pages/utilisateurs/page'));
const RapportsPage = lazy(() => import('../pages/rapports/page'));
const EtatCivilPage = lazy(() => import('../pages/etat-civil/page'));
const UrbanismePage = lazy(() => import('../pages/urbanisme/page'));
const MarchePage = lazy(() => import('../pages/marche/page'));
const AuditPage = lazy(() => import('../pages/audit/page'));
const ParametresPage = lazy(() => import('../pages/parametres/page'));
const BudgetSuiviPage = lazy(() => import('../pages/budget-suivi/page'));
const ProfilPage = lazy(() => import('../pages/profil/page'));
const PortalLoginPage = lazy(() => import('../pages/portal/login/page'));
const PortalDashboardPage = lazy(() => import('../pages/portal/dashboard/page'));
const PortalPayerPage = lazy(() => import('../pages/portal/payer/page'));
const PortalPenalitesPage = lazy(() => import('../pages/portal/penalites/page'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));

function protect(children: ReactNode) {
  return <AuthGate>{children}</AuthGate>;
}

function protectRoles(roles: UiRole[], children: ReactNode) {
  return <RoleGate roles={roles}>{children}</RoleGate>;
}

function protectPortal(children: ReactNode) {
  return <PortalGate>{children}</PortalGate>;
}

function onlyPublic(children: ReactNode) {
  return <PublicOnlyGate>{children}</PublicOnlyGate>;
}

function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    restoreSession()
      .then((session) => {
        if (mounted) setAuthenticated(Boolean(session));
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) return null;
  return authenticated ? children : <Navigate to="/login" replace />;
}

function RoleGate({ roles, children }: { roles: UiRole[]; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<UiRole | null>(null);

  useEffect(() => {
    let mounted = true;
    restoreSession()
      .then((session) => {
        if (mounted) {
          setRole(session?.userRole || getStoredUserRole());
        }
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) return null;
  if (!role) return <Navigate to="/login" replace />;
  return roles.includes(role) ? children : <Navigate to="/dashboard" replace />;
}

function PortalGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    restorePortalSession()
      .then((session) => {
        if (mounted) setAuthenticated(Boolean(session));
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) return null;
  return authenticated ? children : <Navigate to="/portal/login" replace />;
}

function PublicOnlyGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    restoreSession()
      .then((session) => {
        if (mounted) setAuthenticated(Boolean(session));
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) return null;
  return authenticated ? <Navigate to="/dashboard" replace /> : children;
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/login" replace />
  },
  {
    path: '/login',
    element: onlyPublic(<LoginPage />)
  },
  {
    path: '/dashboard',
    element: protect(<DashboardPage />)
  },
  {
    path: '/contribuables',
    element: protectRoles(['admin', 'super_admin', 'agent', 'comptable'], <ContribuablesPage />)
  },
  {
    path: '/recettes',
    element: protectRoles(['admin', 'super_admin', 'agent', 'comptable', 'service_finances'], <RecettesPage />)
  },
  {
    path: '/taxes',
    element: protectRoles(['admin', 'super_admin', 'agent', 'comptable'], <TaxesPage />)
  },
  {
    path: '/taxes/:categorieId',
    element: protectRoles(['admin', 'super_admin', 'agent', 'comptable'], <CategorieDetail />)
  },
  {
    path: '/taxes/nouvelle-transaction',
    element: protectRoles(['admin', 'super_admin', 'agent', 'comptable'], <NouvelleTransaction />)
  },
  {
    path: '/etat-civil',
    element: protectRoles(['admin', 'super_admin', 'agent'], <EtatCivilPage />)
  },
  {
    path: '/urbanisme',
    element: protectRoles(['admin', 'super_admin', 'agent'], <UrbanismePage />)
  },
  {
    path: '/marche',
    element: protectRoles(['admin', 'super_admin', 'agent', 'comptable', 'quai_peche'], <MarchePage />)
  },
  {
    path: '/motos',
    element: protectRoles(['admin', 'super_admin', 'agent', 'comptable', 'quai_peche'], <MotosPage />)
  },
  {
    path: '/formations',
    element: protectRoles(['admin', 'super_admin', 'agent'], <FormationsPage />)
  },
  {
    path: '/penalites',
    element: protectRoles(['admin', 'super_admin', 'agent', 'comptable'], <PenalitesPage />)
  },
  {
    path: '/utilisateurs',
    element: protectRoles(['admin', 'super_admin'], <UtilisateursPage />)
  },
  {
    path: '/rapports',
    element: protectRoles(['admin', 'super_admin'], <RapportsPage />)
  },
  {
    path: '/audit',
    element: protectRoles(['super_admin'], <AuditPage />)
  },
  {
    path: '/budget-suivi',
    element: protectRoles(['comptable', 'service_finances'], <BudgetSuiviPage />)
  },
  {
    path: '/gestion-budget',
    element: protectRoles(['service_finances'], <GestionBudgetPage />)
  },
  {
    path: '/quai-peche',
    element: protectRoles(['quai_peche'], <QuaiPechePage />)
  },
  {
    path: '/quai-peche/commissions',
    element: protectRoles(['quai_peche'], <CommissionsPage />)
  },
  {
    path: '/quai-peche/pecheurs',
    element: protectRoles(['quai_peche'], <PecheursPage />)
  },
  {
    path: '/quai-peche/embarcations',
    element: protectRoles(['quai_peche'], <EmbarcationsPage />)
  },
  {
    path: '/quai-peche/camions',
    element: protectRoles(['quai_peche'], <CamionsPage />)
  },
  {
    path: '/service-finances',
    element: protectRoles(['service_finances'], <ServiceFinancesDashboard />)
  },
  {
    path: '/parametres',
    element: protectRoles(['admin', 'super_admin'], <ParametresPage />)
  },
  {
    path: '/profil',
    element: protect(<ProfilPage />)
  },
  // Routes du portail public (interface contribuant en ligne)
  {
    path: '/portal/login',
    element: <PortalLoginPage />
  },
  {
    path: '/portal/dashboard',
    element: protectPortal(<PortalDashboardPage />)
  },
  {
    path: '/portal/payer',
    element: protectPortal(<PortalPayerPage />)
  },
  {
    path: '/portal/penalites',
    element: <PortalPenalitesPage />
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
];

export default routes;
