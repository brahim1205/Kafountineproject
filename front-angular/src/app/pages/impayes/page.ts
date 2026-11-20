import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { RouterLink } from '@angular/router';
import { Impayes as ImpayesData, RecouvrementApi } from '../../services/recouvrement';
import { getErrorMessage } from '../../utils/form-validation';

@Component({
  selector: 'app-impayes',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './page.html',
})
export class Impayes {
  private readonly api = inject(RecouvrementApi);
  private readonly auth = inject(AuthService);
  /** La page Contribuables n'est ouverte ni à l'administration ni au régisseur : le nom s'affiche sans lien. */
  protected readonly voitContribuables = computed(() => this.auth.role() !== 'admin' && this.auth.role() !== 'regisseur');

  protected readonly data = signal<ImpayesData | null>(null);
  protected readonly erreur = signal('');
  protected readonly recherche = signal('');
  protected readonly type = signal('tous');

  protected readonly lignes = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    return (this.data()?.lignes ?? []).filter((ligne) =>
      (this.type() === 'tous' || ligne.type === this.type()) &&
      (!terme || `${ligne.contribuable} ${ligne.reference} ${ligne.telephone ?? ''}`.toLowerCase().includes(terme)));
  });

  constructor() {
    this.api.impayes().then((data) => this.data.set(data))
      .catch((error: unknown) => this.erreur.set(getErrorMessage(error, 'Impossible de charger les impayés.')));
  }

  protected montant(value: number): string {
    return `${value.toLocaleString('fr-FR')} FCFA`;
  }

  protected date(value: string | null): string {
    return value ? new Date(value).toLocaleDateString('fr-FR') : '-';
  }
}
