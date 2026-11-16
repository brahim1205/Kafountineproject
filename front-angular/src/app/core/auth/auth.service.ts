import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';
import { ApiEnvelope } from '../api/api.models';
import { ApiAuthUser, StoredSession, UiRole } from './auth.models';

const SESSION_STORAGE_KEY = 'auth_session';
const RESTORE_RETRY_COOLDOWN_MS = 5_000;
const LOGIN_UNREACHABLE = 'Impossible de contacter le serveur de connexion';
const API = '/api/v1/auth';
/** Rôles en consultation seule. */
const READ_ONLY_ROLES: ReadonlySet<UiRole> = new Set<UiRole>(['admin']);

function toUiRole(role: string): UiRole {
  switch (role?.toUpperCase()) {
    case 'ADMIN':
      return 'admin';
    case 'SUPER_ADMIN':
      return 'super_admin';
    case 'SERVICE_FINANCES':
      return 'service_finances';
    case 'REGISSEUR':
      return 'regisseur';
    case 'ETAT_CIVIL':
      return 'etat_civil';
    case 'QUAI_PECHE':
      return 'quai_peche';
    default:
      return 'agent';
  }
}

function initials(prenom: string, nom: string): string {
  const value = `${(prenom || '').trim().charAt(0)}${(nom || '').trim().charAt(0)}`.toUpperCase();
  return value || 'US';
}

function readStored(): StoredSession | null {
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionState = signal<StoredSession | null>(readStored());
  private pendingRestore: Promise<StoredSession | null> | null = null;
  private lastRestoreFailureAt = 0;

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly role = computed(() => this.sessionState()?.userRole ?? null);
  readonly userName = computed(() => this.sessionState()?.userName ?? '');
  readonly userId = computed(() => this.sessionState()?.userId ?? null);
  readonly userInitials = computed(() => this.sessionState()?.userInitials ?? '');
  readonly canWrite = computed(() => {
    const role = this.role();
    return !!role && !READ_ONLY_ROLES.has(role);
  });

  canWriteRole(role: UiRole | null = this.role()): boolean {
    return !!role && !READ_ONLY_ROLES.has(role);
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const envelope = await firstValueFrom(
        this.http.post<ApiEnvelope<{ user: ApiAuthUser }>>(`${API}/login`, { email, password }, { withCredentials: true }),
      );
      this.store(envelope.data.user);
    } catch (error) {
      // status 0 : erreur réseau, dont le message technique du navigateur ne doit pas être affiché.
      const message = error instanceof HttpErrorResponse && error.status > 0 ? error.error?.message : undefined;
      throw new Error(message || LOGIN_UNREACHABLE, { cause: error });
    }
  }

  fetchCurrentUser(): Promise<ApiAuthUser> {
    return firstValueFrom(this.http.get<ApiEnvelope<ApiAuthUser>>(`${API}/me`, { withCredentials: true }).pipe(tap((e) => this.store(e.data)), map((e) => e.data)));
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${API}/logout`, {}, { withCredentials: true }));
    } catch {
      // La session locale est fermée même si le serveur ne répond pas.
    } finally {
      this.clearSession();
    }
  }

  refresh(): Observable<boolean> {
    return this.http.post(`${API}/refresh`, {}, { withCredentials: true }).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  async requestPasswordReset(email: string): Promise<string> {
    try {
      const envelope = await firstValueFrom(
        this.http.post<ApiEnvelope<unknown>>(`${API}/forgot-password`, { email }, { withCredentials: true }),
      );
      return envelope.message || 'Si un compte existe avec cet email, une demande a été transmise à l’administrateur.';
    } catch (error) {
      const message = error instanceof HttpErrorResponse && error.status > 0 ? error.error?.message : undefined;
      throw new Error(message || 'Impossible de traiter la demande de réinitialisation.', { cause: error });
    }
  }

  /** Reprend la session depuis le stockage, sinon depuis le cookie du serveur. */
  restore(): Promise<StoredSession | null> {
    const existing = this.sessionState();
    if (existing) return Promise.resolve(existing);
    if (this.pendingRestore) return this.pendingRestore;
    if (Date.now() - this.lastRestoreFailureAt < RESTORE_RETRY_COOLDOWN_MS) return Promise.resolve(null);

    this.pendingRestore = firstValueFrom(
      this.http.get<ApiEnvelope<ApiAuthUser>>(`${API}/me`, { withCredentials: true }).pipe(tap((e) => this.store(e.data))),
    )
      .then(() => this.sessionState())
      .catch(() => {
        this.lastRestoreFailureAt = Date.now();
        this.clearSession();
        return null;
      })
      .finally(() => {
        this.pendingRestore = null;
      });
    return this.pendingRestore;
  }

  clearSession(): void {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    this.sessionState.set(null);
  }

  private store(user: ApiAuthUser): void {
    const session: StoredSession = {
      userId: user.id,
      userRole: toUiRole(user.role),
      userName: `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email,
      userInitials: initials(user.prenom, user.nom),
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.sessionState.set(session);
  }
}
