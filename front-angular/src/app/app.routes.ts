import { Routes } from '@angular/router';
import { authGuard, publicOnlyGuard, roleGuard } from './core/auth/auth.guards';
import { PendingPage } from './features/pending/pending-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', canActivate: [publicOnlyGuard], loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/dashboard-layout/dashboard-layout').then((m) => m.DashboardLayout),
    children: [
      { path: 'dashboard', component: PendingPage, data: { title: 'dashboard' } },
      { path: 'recettes', canActivate: [roleGuard(['admin', 'super_admin', 'agent', 'service_finances', 'regisseur'])], component: PendingPage, data: { title: 'recettes' } },
      { path: 'taxes', canActivate: [roleGuard(['admin', 'super_admin', 'agent', 'regisseur'])], component: PendingPage, data: { title: 'taxes' } },
      { path: 'taxes/:categorieId', canActivate: [roleGuard(['admin', 'super_admin', 'agent', 'etat_civil', 'regisseur'])], component: PendingPage, data: { title: 'taxes/:categorieId' } },
      { path: 'taxes/nouvelle-transaction', canActivate: [roleGuard(['admin', 'super_admin', 'agent', 'etat_civil', 'regisseur'])], component: PendingPage, data: { title: 'taxes/nouvelle-transaction' } },
      { path: 'etat-civil/nouvelle', canActivate: [roleGuard(['etat_civil'])], component: PendingPage, data: { title: 'etat-civil/nouvelle' } },
      { path: 'etat-civil/a-traiter', canActivate: [roleGuard(['etat_civil'])], component: PendingPage, data: { title: 'etat-civil/a-traiter' } },
      { path: 'etat-civil/historique', canActivate: [roleGuard(['etat_civil'])], component: PendingPage, data: { title: 'etat-civil/historique' } },
      { path: 'etat-civil/statistiques', canActivate: [roleGuard(['etat_civil'])], component: PendingPage, data: { title: 'etat-civil/statistiques' } },
      { path: 'etat-civil', canActivate: [roleGuard(['admin'])], component: PendingPage, data: { title: 'etat-civil' } },
      { path: 'urbanisme', canActivate: [roleGuard(['admin', 'super_admin', 'agent', 'regisseur'])], component: PendingPage, data: { title: 'urbanisme' } },
      { path: 'marche', canActivate: [roleGuard(['admin', 'super_admin', 'agent', 'quai_peche', 'regisseur'])], component: PendingPage, data: { title: 'marche' } },
      { path: 'motos', canActivate: [roleGuard(['admin', 'super_admin', 'agent', 'quai_peche', 'regisseur'])], component: PendingPage, data: { title: 'motos' } },
      { path: 'formations', canActivate: [roleGuard(['admin', 'super_admin', 'agent', 'regisseur'])], component: PendingPage, data: { title: 'formations' } },
      { path: 'penalites', canActivate: [roleGuard(['admin', 'super_admin', 'agent', 'regisseur'])], component: PendingPage, data: { title: 'penalites' } },
      { path: 'utilisateurs', canActivate: [roleGuard(['admin', 'super_admin', 'regisseur'])], component: PendingPage, data: { title: 'utilisateurs' } },
      { path: 'rapports', canActivate: [roleGuard(['admin', 'super_admin'])], component: PendingPage, data: { title: 'rapports' } },
      { path: 'audit', canActivate: [roleGuard(['super_admin'])], component: PendingPage, data: { title: 'audit' } },
      { path: 'budget-suivi', canActivate: [roleGuard(['service_finances'])], component: PendingPage, data: { title: 'budget-suivi' } },
      { path: 'gestion-budget', canActivate: [roleGuard(['service_finances'])], component: PendingPage, data: { title: 'gestion-budget' } },
      { path: 'quai-peche', redirectTo: 'quai-peche/commissions', pathMatch: 'full' },
      { path: 'quai-peche/commissions', canActivate: [roleGuard(['quai_peche', 'regisseur'])], component: PendingPage, data: { title: 'quai-peche/commissions' } },
      { path: 'quai-peche/pecheurs', canActivate: [roleGuard(['quai_peche', 'regisseur'])], component: PendingPage, data: { title: 'quai-peche/pecheurs' } },
      { path: 'quai-peche/embarcations', canActivate: [roleGuard(['quai_peche', 'regisseur'])], component: PendingPage, data: { title: 'quai-peche/embarcations' } },
      { path: 'quai-peche/camions', canActivate: [roleGuard(['quai_peche', 'regisseur'])], component: PendingPage, data: { title: 'quai-peche/camions' } },
      { path: 'service-finances', canActivate: [roleGuard(['service_finances', 'admin', 'super_admin'])], component: PendingPage, data: { title: 'service-finances' } },
      { path: 'parametres', canActivate: [roleGuard(['admin', 'super_admin'])], component: PendingPage, data: { title: 'parametres' } },
      { path: 'profil', component: PendingPage, data: { title: 'profil' } },
    ],
  },
  { path: '**', loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound) },
];
