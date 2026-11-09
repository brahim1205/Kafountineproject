import { Injectable, effect, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { AuthService } from '../auth/auth.service';

const CURRENT_YEAR = new Date().getFullYear();

/** Années proposées dans le sélecteur de l'en-tête. */
export const AVAILABLE_YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, index) => CURRENT_YEAR - index);

@Injectable({ providedIn: 'root' })
export class YearService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly selected = signal(CURRENT_YEAR);

  readonly selectedYear = this.selected.asReadonly();
  readonly currentYear = CURRENT_YEAR;

  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this.selected.set(CURRENT_YEAR);
        return;
      }
      this.api.get<{ annee: number }[]>('/years').subscribe({
        next: (years) => {
          const values = years.map((item) => Number(item.annee)).filter(Number.isFinite).sort((a, b) => b - a);
          if (values.length > 0 && !values.includes(this.selected())) this.selected.set(values[0]);
        },
        error: () => undefined,
      });
    });
  }

  select(year: number): void {
    this.selected.set(year);
  }
}
