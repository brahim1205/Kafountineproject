import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiEnvelope, ApiError, Page, QueryParams } from './api.models';

export const API_BASE_URL = '/api/v1';

function toParams(query?: QueryParams): HttpParams {
  let params = new HttpParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
  });
  return params;
}

function toApiError(error: unknown): Error {
  if (!(error instanceof HttpErrorResponse)) return error instanceof Error ? error : new Error(String(error));
  if (error.status === 0) {
    return new Error("Impossible de se connecter au serveur. Veuillez vérifier que le backend est en cours d'exécution.");
  }
  const message = (error.error as { message?: string } | null)?.message;
  return new ApiError(
    message || `L'action a échoué côté serveur (code ${error.status}). Veuillez vérifier les informations saisies.`,
    error.status,
  );
}

/** Accès à l'API : déballe l'enveloppe `{ success, data, meta }` et normalise les erreurs. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, query?: QueryParams): Observable<T> {
    return this.http.get<ApiEnvelope<T>>(`${API_BASE_URL}${path}`, { params: toParams(query) }).pipe(
      map((envelope) => envelope.data),
      catchError((error) => throwError(() => toApiError(error))),
    );
  }

  getPage<T>(path: string, query?: QueryParams): Observable<Page<T>> {
    return this.http.get<ApiEnvelope<T[]>>(`${API_BASE_URL}${path}`, { params: toParams(query) }).pipe(
      map((envelope) => ({
        data: envelope.data ?? [],
        meta: envelope.meta ?? { page: 1, limit: envelope.data?.length ?? 0, total: envelope.data?.length ?? 0 },
      })),
      catchError((error) => throwError(() => toApiError(error))),
    );
  }

  post<T>(path: string, body: unknown = {}, options: { idempotent?: boolean } = {}): Observable<T> {
    const headers = options.idempotent ? new HttpHeaders({ 'idempotency-key': crypto.randomUUID() }) : undefined;
    return this.http.post<ApiEnvelope<T>>(`${API_BASE_URL}${path}`, body, { headers }).pipe(
      map((envelope) => envelope.data),
      catchError((error) => throwError(() => toApiError(error))),
    );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiEnvelope<T>>(`${API_BASE_URL}${path}`, body).pipe(
      map((envelope) => envelope.data),
      catchError((error) => throwError(() => toApiError(error))),
    );
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<ApiEnvelope<T>>(`${API_BASE_URL}${path}`, body).pipe(
      map((envelope) => envelope.data),
      catchError((error) => throwError(() => toApiError(error))),
    );
  }

  delete<T = void>(path: string): Observable<T> {
    return this.http.delete<ApiEnvelope<T>>(`${API_BASE_URL}${path}`).pipe(
      map((envelope) => envelope.data),
      catchError((error) => throwError(() => toApiError(error))),
    );
  }
}
