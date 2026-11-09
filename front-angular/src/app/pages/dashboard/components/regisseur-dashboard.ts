import { ChangeDetectionStrategy, Component, inject, signal, effect, untracked } from '@angular/core';
import { MotoStats } from '../../../services/motos';
import { UserItem } from '../../../services/users';
import { YearService } from '../../../core/year/year.service';
import { RouterLink } from '@angular/router';
import { UsersApi } from '../../../services/users';
import { MotosApi } from '../../../services/motos';

const EQUIPES = [
  { role: 'AGENT', label: 'Agents de terrain', icon: 'ri-user-location-line', color: 'text-sky-600 bg-sky-50' },
  { role: 'QUAI_PECHE', label: 'Agents quai de pêche', icon: 'ri-ship-line', color: 'text-emerald-600 bg-emerald-50' },
  { role: 'SERVICE_FINANCES', label: 'Service finances', icon: 'ri-bank-card-line', color: 'text-emerald-600 bg-emerald-50' },
];

const ACTIONS = [
  { label: 'Équipes et rôles', icon: 'ri-team-line', to: '/utilisateurs' },
  { label: 'Motos', icon: 'ri-motorbike-line', to: '/motos' },
  { label: 'Recettes', icon: 'ri-money-dollar-circle-line', to: '/recettes' },
  { label: 'Taxes', icon: 'ri-file-list-3-line', to: '/taxes' },
  { label: 'Marché', icon: 'ri-store-2-line', to: '/marche' },
  { label: 'Quai de pêche', icon: 'ri-ship-2-line', to: '/quai-peche/commissions' },
];

@Component({
  selector: 'app-regisseur-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './regisseur-dashboard.html',
})
export class RegisseurDashboard {
  protected readonly Number = Number;
  protected readonly EQUIPES = EQUIPES;
  protected readonly ACTIONS = ACTIONS;
  protected readonly yearService = inject(YearService);
  protected readonly usersApi = inject(UsersApi);
  protected readonly motosApi = inject(MotosApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly users = signal<UserItem[]>([]);

  protected readonly motos = signal<MotoStats>({});

  protected activeMembers(equipe: { role: string }) {
    return this.users().filter((user) => user.role === equipe.role && user.isActive).length;
  }

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => {
    this.usersApi.listUsers().then(value => this.users.set(value)).catch(() => this.users.set([]));
    this.motosApi.getMotosStats(this.selectedYear()).then(value => this.motos.set(value)).catch(() => this.motos.set({}));
      });
    });
  }
}
