import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UiRole } from './auth.models';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  return (await inject(AuthService).restore()) ? true : router.createUrlTree(['/login']);
};

export const publicOnlyGuard: CanActivateFn = async () => {
  const router = inject(Router);
  return (await inject(AuthService).restore()) ? router.createUrlTree(['/dashboard']) : true;
};

export function roleGuard(roles: UiRole[]): CanActivateFn {
  return async () => {
    const router = inject(Router);
    const session = await inject(AuthService).restore();
    if (!session) return router.createUrlTree(['/login']);
    return roles.includes(session.userRole) ? true : router.createUrlTree(['/dashboard']);
  };
}
