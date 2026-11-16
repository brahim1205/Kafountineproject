import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.service';

type Recu = { numero: string; service: string; objet: string; montant: number; date: string; etat: 'VALIDE' | 'ANNULE' | 'EN_ATTENTE' };

const ETATS: Record<Recu['etat'], { titre: string; detail: string; classe: string; icone: string }> = {
  VALIDE: { titre: 'Reçu valide', detail: 'Ce paiement est bien enregistré par la commune.', classe: 'border-emerald-200 bg-emerald-50 text-emerald-900', icone: 'ri-checkbox-circle-line' },
  ANNULE: { titre: 'Reçu annulé', detail: 'Ce reçu a été annulé : il ne vaut plus preuve de paiement.', classe: 'border-red-200 bg-red-50 text-red-900', icone: 'ri-close-circle-line' },
  EN_ATTENTE: { titre: 'Demande en cours', detail: 'Le dossier existe mais n’est pas encore réglé ou délivré.', classe: 'border-amber-200 bg-amber-50 text-amber-900', icone: 'ri-time-line' },
};

/**
 * Interface contribuable : vérifier un reçu de la commune par son numéro (ou en scannant son QR code),
 * sans compte. Seuls le numéro, l'objet, le montant, la date et la validité sont affichés.
 */
@Component({
  selector: 'app-verification',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './verification.html',
})
export class Verification {
  private readonly http = inject(HttpClient);
  protected readonly ETATS = ETATS;
  protected readonly numero = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('recu') ?? '');
  protected readonly recu = signal<Recu | null>(null);
  protected readonly erreur = signal('');
  protected readonly chargement = signal(false);

  constructor() {
    if (this.numero()) void this.verifier();
  }

  protected async verifier(event?: Event): Promise<void> {
    event?.preventDefault();
    const numero = this.numero().trim();
    this.recu.set(null);
    this.erreur.set('');
    if (numero.length < 3) {
      this.erreur.set('Saisissez le numéro inscrit sur le reçu (par exemple TX-2026-0042).');
      return;
    }
    this.chargement.set(true);
    try {
      const reponse = await firstValueFrom(this.http.get<{ data: Recu }>(`${API_BASE_URL}/public/recus/${encodeURIComponent(numero)}`));
      this.recu.set(reponse.data);
    } catch (error) {
      const statut = error instanceof HttpErrorResponse ? error.status : 0;
      this.erreur.set(statut === 404 ? 'Aucun reçu de la commune ne porte ce numéro. Vérifiez la saisie : un reçu introuvable n’est pas un reçu officiel.'
        : statut === 429 ? 'Trop de vérifications en peu de temps. Réessayez dans une minute.'
          : 'La vérification est momentanément impossible. Réessayez plus tard.');
    } finally {
      this.chargement.set(false);
    }
  }

  protected montant(value: number): string {
    return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
  }

  protected date(value: string): string {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
