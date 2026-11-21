import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable } from '@angular/core';
import { ApiError } from '../api/api.models';
import { API_BASE_URL } from '../api/api.service';

const MAX_RAPPORTS_PAR_PAGE = 10;

/** Texte et pile d'une erreur quelconque, tronqués aux limites acceptées par le serveur. */
export function decrireErreur(error: unknown): { message: string; stack?: string } {
  const cause = error instanceof Error ? error : null;
  const message = (cause ? `${cause.name}: ${cause.message}` : String(error)).slice(0, 1000) || 'Erreur inconnue';
  const stack = cause?.stack ? cause.stack.slice(0, 8000) : undefined;
  return { message, stack };
}

/**
 * Affiche l'erreur dans la console puis la transmet au backend, qui l'écrit dans ses logs.
 * Les erreurs d'API sont ignorées : le serveur les a déjà journalisées. Les doublons et
 * les rafales sont limités pour ne jamais surcharger le serveur.
 */
@Injectable()
export class ClientErrorHandler implements ErrorHandler {
  private readonly dejaEnvoyees = new Set<string>();

  handleError(error: unknown): void {
    console.error(error);
    if (error instanceof HttpErrorResponse || error instanceof ApiError) return;
    const rapport = decrireErreur(error);
    if (this.dejaEnvoyees.has(rapport.message) || this.dejaEnvoyees.size >= MAX_RAPPORTS_PAR_PAGE) return;
    this.dejaEnvoyees.add(rapport.message);
    if (typeof fetch !== 'function') return;
    fetch(`${API_BASE_URL}/client-errors`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rapport, page: location.pathname.slice(0, 500) }),
    }).catch((envoi: unknown) => console.warn("Rapport d'erreur non transmis", envoi));
  }
}
