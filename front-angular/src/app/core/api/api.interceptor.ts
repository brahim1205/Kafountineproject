import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, retry, switchMap, throwError, timeout, timer } from 'rxjs';
import { AuthService } from '../auth/auth.service';

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_000;
const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/me', '/auth/forgot-password'];

/** Les sessions reposent sur des cookies : toutes les requêtes de l'API les transmettent. */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.url.startsWith('/api/') ? req.clone({ withCredentials: true }) : req);

/** Délai maximal, puis nouvel essai progressif quand le serveur limite le débit (429). */
export const resilienceInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    timeout(REQUEST_TIMEOUT_MS),
    retry({
      count: MAX_RETRIES,
      delay: (error, attempt) =>
        error instanceof HttpErrorResponse && error.status === 429
          ? timer(RETRY_DELAY_MS * 2 ** (attempt - 1))
          : throwError(() => error),
    }),
  );

/** Renouvelle la session sur un 401, rejoue la requête une fois, sinon renvoie vers la connexion. */
export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isAuthCall = AUTH_PATHS.some((path) => req.url.includes(path));

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthCall || !auth.isAuthenticated()) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap((refreshed) => {
          if (refreshed) return next(req);
          auth.clearSession();
          void router.navigateByUrl('/login');
          return throwError(() => new Error('Session expirée. Veuillez vous reconnecter.'));
        }),
      );
    }),
  );
};
