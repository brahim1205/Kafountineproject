import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { clearFieldValidationError } from '../../utils/form-validation';
import { Field } from './field';
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
  selector: 'app-user-form',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Field],
  templateUrl: './user-form.html',
})
export class UserForm {
  protected readonly ROLE_LABELS = ROLE_LABELS;
  protected readonly roleOptions = roleOptions;
  protected readonly clearFieldValidationError = clearFieldValidationError;

  readonly submitted = output<Event>();

  readonly cancelled = output<void>();

  readonly defaultValues = input<{ name?: string; email?: string; role?: string; phone?: string; status?: string } | undefined>(undefined);

  readonly requirePassword = input<boolean>(false);
}
