import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { getErrorMessage, validateFormElement } from '../../utils/form-validation';
import { YearService } from '../../core/year/year.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AuthService } from '../../core/auth/auth.service';
import { UsersApi } from '../../services/users';
import { Modal } from './modal';
import { Stat } from './stat';
import { UserForm } from './user-form';
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
  selector: 'app-utilisateurs',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Stat, Modal, UserForm],
  templateUrl: './page.html',
})
export class Utilisateurs {
  protected readonly ROLE_LABELS = ROLE_LABELS;
  protected readonly roleOptions = roleOptions;
  protected readonly yearService = inject(YearService);
  protected readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly usersApi = inject(UsersApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected readonly searchTerm = signal('');

  protected readonly filterRole = signal('all');

  protected readonly rows = signal<UiUser[]>([]);

  protected readonly showAddModal = signal(false);

  protected readonly showEditModal = signal(false);

  protected readonly showDeleteModal = signal(false);

  protected readonly selectedUser = signal<UiUser | null>(null);

  protected async loadData() {
    try {
    const data = await this.usersApi.listUsers();
    const mapped = (data || []).map((item) => ({
    id: item.id,
    name: `${item.prenom || ''} ${item.nom || ''}`.trim(),
    email: item.email,
    role: item.role,
    phone: item.telephone || '-',
    status: item.isActive ? 'Actif' : 'Inactif',
    lastLogin: item.lastLogin ? new Date(item.lastLogin).toLocaleString('fr-FR') : '-',
    }));
    this.rows.set(mapped);
    }
    catch {
    this.rows.set([]);
    this.toast.show("Impossible de charger les utilisateurs.", 'error');
    }
    }

  protected readonly filteredData = computed(() => {
    return this.rows().filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(this.searchTerm().toLowerCase()) || item.email.toLowerCase().includes(this.searchTerm().toLowerCase());
    const matchesRole = this.filterRole() === 'all' || item.role === this.filterRole();
    return matchesSearch && matchesRole;
    });
    });

  protected async handleCreate(e: Event) {
    e.preventDefault();
    if (!validateFormElement((e.currentTarget as HTMLFormElement))) {
    return;
    }
    const fd = new FormData((e.currentTarget as HTMLFormElement));
    const fullName = String(fd.get('name') || '').trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const prenom = parts.shift() || 'Sans';
    const nom = parts.join(' ') || 'Nom';
    try {
    await this.usersApi.createUser({
    email: String(fd.get('email') || '').trim(),
    prenom,
    nom,
    role: String(fd.get('role') || 'AGENT'),
    telephone: String(fd.get('phone') || '').trim(),
    password: String(fd.get('password') || '').trim(),
    });
    this.showAddModal.set(false);
    await this.loadData();
    }
    catch (error) {
    this.toast.show(getErrorMessage(error, "La création de l'utilisateur a échoué."), 'error');
    }
    }

  protected async handleEdit(e: Event) {
    e.preventDefault();
    if (!this.selectedUser())
    return;
    if (!validateFormElement((e.currentTarget as HTMLFormElement))) {
    return;
    }
    const fd = new FormData((e.currentTarget as HTMLFormElement));
    const fullName = String(fd.get('name') || '').trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const prenom = parts.shift() || 'Sans';
    const nom = parts.join(' ') || 'Nom';
    try {
    await this.usersApi.updateUser(this.selectedUser()!.id, {
    email: String(fd.get('email') || '').trim(),
    prenom,
    nom,
    role: String(fd.get('role') || 'AGENT'),
    telephone: String(fd.get('phone') || '').trim(),
    isActive: String(fd.get('status') || 'Actif') === 'Actif',
    ...(String(fd.get('password') || '').trim() ? { password: String(fd.get('password')).trim() } : {}),
    });
    this.showEditModal.set(false);
    this.selectedUser.set(null);
    await this.loadData();
    }
    catch (error) {
    this.toast.show(getErrorMessage(error, "La mise à jour de l'utilisateur a échoué."), 'error');
    }
    }

  protected async confirmDelete() {
    if (!this.selectedUser())
    return;
    try {
    await this.usersApi.deleteUser(this.selectedUser()!.id);
    this.showDeleteModal.set(false);
    this.selectedUser.set(null);
    await this.loadData();
    }
    catch {
    this.toast.show("Erreur lors de la suppression de l'utilisateur.", 'error');
    }
    }

  protected readonly statAdmin = computed(() => this.rows().filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length);

  protected readonly statAgent = computed(() => this.rows().filter((u) => u.role === 'AGENT').length);

  constructor() {
    effect(() => {
      
      untracked(() => {
    this.loadData();
      });
    });
  }
}
