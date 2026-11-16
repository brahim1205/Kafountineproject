import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiRole } from '../../core/auth/auth.models';
import { allMenuItems, roleLabels } from '../../layout/menu';

const ROLES: UiRole[] = ['super_admin', 'admin', 'regisseur', 'agent', 'service_finances', 'etat_civil', 'quai_peche'];

/** Ce que chaque rôle fait, en une phrase (règles appliquées par le serveur). */
const MISSIONS: Record<UiRole, string> = {
  super_admin: 'Tout : paramètres, tarifs, sauvegardes, journal d’audit, annulation des recettes.',
  admin: 'Consulte tous les modules et les statistiques, sans rien modifier (le maire).',
  regisseur: 'Encadre les équipes, gère l’adhésion des motos, valide les caisses et annule les recettes (hors état civil).',
  agent: 'Enregistre les recettes sur le terrain : tickets, cotisations et retards des motos, loyers du marché ; tient sa caisse.',
  service_finances: 'Budget, dépenses, validation des caisses et suivi des impayés.',
  etat_civil: 'Demandes d’actes d’état civil, leur délivrance et sa caisse.',
  quai_peche: 'Quai de pêche : pêcheurs, embarcations, commissions frigorifiques, camions et expéditions ; consulte motos et marché.',
};

/**
 * Rôles et permissions (cahier des charges, administrateur système). La matrice est construite à partir du menu
 * réel de l'application : elle ne peut pas diverger des droits appliqués. Les droits ne se modifient pas ici :
 * ils sont vérifiés par le serveur à chaque requête ; le rôle d'un compte se choisit dans « Utilisateurs ».
 */
@Component({
  selector: 'app-roles-page',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './page.html',
})
export class RolesPage {
  protected readonly roles = ROLES;
  protected readonly roleLabels = roleLabels;
  protected readonly missions = MISSIONS;
  /** Une ligne par page réelle : une même page peut porter plusieurs libellés selon le rôle (« Motos » / « Motos Jakarta »). */
  protected readonly pages = Object.values(
    allMenuItems
      .filter((item) => item.path !== '/dashboard')
      .reduce<Record<string, { path: string; icon: string; label: string; roles: string[] }>>((parPage, item) => {
        const existante = parPage[item.path];
        if (!existante) parPage[item.path] = { ...item, roles: [...item.roles] };
        else {
          if (item.roles.length > existante.roles.length) Object.assign(existante, { label: item.label, icon: item.icon });
          existante.roles = [...new Set([...existante.roles, ...item.roles])];
        }
        return parPage;
      }, {}),
  );

  protected acces(roles: string[], role: UiRole): boolean {
    return roles.includes(role);
  }
}
