import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { storedRole } from '../../core/auth/auth.models';

type UiUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  status: string;
  lastLogin: string;
};

const ROLE_OPTIONS = ['SUPER_ADMIN', 'ADMIN', 'SERVICE_FINANCES', 'QUAI_PECHE', 'ETAT_CIVIL', 'REGISSEUR', 'AGENT'];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  SERVICE_FINANCES: 'Service des finances',
  QUAI_PECHE: 'Agent quai de pêche',
  ETAT_CIVIL: 'État civil',
  REGISSEUR: 'Régisseur',
  AGENT: 'Agent de terrain',
};

const REGISSEUR_ROLE_OPTIONS = ['AGENT', 'QUAI_PECHE', 'SERVICE_FINANCES'];

const roleOptions = () => (storedRole() === 'regisseur' ? REGISSEUR_ROLE_OPTIONS : ROLE_OPTIONS);

@Component({
  selector: 'app-stat',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './stat.html',
})
export class Stat {

  readonly title = input.required<string>();

  readonly value = input.required<number>();

  readonly icon = input.required<string>();
}
