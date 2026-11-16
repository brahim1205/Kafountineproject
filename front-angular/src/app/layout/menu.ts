import { UiRole } from '../core/auth/auth.models';

/** Modules activés dans cette version. */
export const FEATURES = { formations: false };

export interface MenuItem {
  path: string;
  icon: string;
  label: string;
  roles: string[];
}

export const allMenuItems: MenuItem[] = [
  { path: '/dashboard', icon: 'ri-dashboard-line', label: 'Tableau de bord', roles: ['admin', 'super_admin', 'agent', 'service_finances', 'quai_peche', 'etat_civil', 'regisseur'] },
  { path: '/utilisateurs', icon: 'ri-team-line', label: 'Équipes et rôles', roles: ['regisseur'] },
  { path: '/etat-civil/nouvelle', icon: 'ri-file-add-line', label: 'Nouvelle demande', roles: ['etat_civil'] },
  { path: '/etat-civil/a-traiter', icon: 'ri-time-line', label: 'À traiter', roles: ['etat_civil'] },
  { path: '/etat-civil/historique', icon: 'ri-history-line', label: 'Historique', roles: ['etat_civil'] },
  { path: '/taxes/etat-civil', icon: 'ri-file-list-3-line', label: 'Anciens tickets', roles: ['etat_civil'] },
  { path: '/etat-civil/statistiques', icon: 'ri-bar-chart-box-line', label: 'Statistiques', roles: ['etat_civil'] },
  { path: '/quai-peche/commissions', icon: 'ri-snowy-line', label: 'Commissions Frigorifiques', roles: ['quai_peche', 'regisseur'] },
  { path: '/quai-peche/pecheurs', icon: 'ri-user-line', label: 'Pêcheurs', roles: ['quai_peche', 'regisseur'] },
  { path: '/quai-peche/embarcations', icon: 'ri-ship-2-line', label: 'Embarcations', roles: ['quai_peche', 'regisseur'] },
  { path: '/quai-peche/camions', icon: 'ri-truck-line', label: 'Camions Frigorifiques', roles: ['quai_peche', 'regisseur'] },
  { path: '/quai-peche/droits', icon: 'ri-coins-line', label: 'Droits du quai', roles: ['quai_peche'] },
  { path: '/motos', icon: 'ri-motorbike-line', label: 'Motos Jakarta', roles: ['quai_peche'] },
  { path: '/marche', icon: 'ri-store-2-line', label: 'Marché', roles: ['quai_peche'] },
  { path: '/recettes', icon: 'ri-money-dollar-circle-line', label: 'Recettes', roles: ['admin', 'super_admin', 'agent', 'service_finances', 'regisseur'] },
  { path: '/taxes', icon: 'ri-file-list-3-line', label: 'Taxes', roles: ['agent', 'regisseur'] },
  ...(FEATURES.formations ? [{ path: '/formations', icon: 'ri-graduation-cap-line', label: 'Formations', roles: ['admin', 'super_admin', 'agent', 'regisseur'] }] : []),
  { path: '/penalites', icon: 'ri-alert-line', label: 'Pénalités', roles: ['admin', 'super_admin', 'agent', 'regisseur'] },
  { path: '/etat-civil', icon: 'ri-file-text-line', label: 'État Civil', roles: ['admin'] },
  { path: '/urbanisme', icon: 'ri-building-line', label: 'Urbanisme', roles: ['admin', 'super_admin', 'agent', 'regisseur'] },
  { path: '/marche', icon: 'ri-store-2-line', label: 'Marché', roles: ['admin', 'super_admin', 'agent', 'regisseur'] },
  { path: '/motos', icon: 'ri-motorbike-line', label: 'Motos', roles: ['admin', 'super_admin', 'agent', 'regisseur'] },
  { path: '/utilisateurs', icon: 'ri-team-line', label: 'Utilisateurs', roles: ['admin', 'super_admin'] },
  { path: '/roles', icon: 'ri-shield-user-line', label: 'Rôles et permissions', roles: ['admin', 'super_admin'] },
  { path: '/budget-suivi', icon: 'ri-wallet-3-line', label: 'Suivi Budgétaire', roles: ['service_finances'] },
  { path: '/gestion-budget', icon: 'ri-money-dollar-circle-line', label: 'Gestion Budget', roles: ['service_finances'] },
  { path: '/service-finances', icon: 'ri-bank-card-line', label: 'Budget & dépenses', roles: ['admin', 'super_admin'] },
  { path: '/caisse', icon: 'ri-safe-2-line', label: 'Caisse', roles: ['admin', 'super_admin', 'agent', 'service_finances', 'etat_civil', 'regisseur', 'quai_peche'] },
  { path: '/activite-agents', icon: 'ri-bar-chart-grouped-line', label: 'Activité des agents', roles: ['admin', 'super_admin', 'regisseur'] },
  { path: '/impayes', icon: 'ri-error-warning-line', label: 'Impayés', roles: ['admin', 'super_admin', 'agent', 'service_finances', 'quai_peche', 'regisseur'] },
  { path: '/contribuables', icon: 'ri-group-line', label: 'Contribuables', roles: ['admin', 'super_admin', 'agent', 'service_finances', 'etat_civil', 'regisseur'] },
  { path: '/audit', icon: 'ri-file-list-3-line', label: 'Journal Audit', roles: ['super_admin'] },
];

export const roleLabels: Record<UiRole, string> = {
  admin: 'Administrateur',
  super_admin: 'Super Administrateur',
  agent: 'Agent municipal',
  service_finances: 'Service des Finances',
  quai_peche: 'Quai de Pêche',
  etat_civil: 'État civil',
  regisseur: 'Régisseur'
};

/**
 * Ordre du menu du régisseur, sans titres de rubrique : d'abord le suivi de l'argent,
 * puis les services, le quai de pêche, et enfin les contribuables et les équipes.
 */
export const ORDRE_REGISSEUR = [
  '/dashboard', '/recettes', '/caisse', '/impayes', '/taxes', '/penalites',
  '/marche', '/motos', '/urbanisme',
  '/quai-peche/commissions', '/quai-peche/pecheurs', '/quai-peche/embarcations', '/quai-peche/camions',
  '/contribuables', '/utilisateurs',
];

export const playNotificationSound = () => {
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
