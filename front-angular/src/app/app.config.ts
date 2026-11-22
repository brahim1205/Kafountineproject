import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter, withComponentInputBinding, withNavigationErrorHandler } from '@angular/router';
import { credentialsInterceptor, resilienceInterceptor, sessionInterceptor } from './core/api/api.interceptor';
import { routes } from './app.routes';
import { ClientErrorHandler } from './core/errors/client-error-handler';
import { estModuleIntrouvable, rechargerVersPageActuelle } from './core/errors/version-perimee';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Page chargée à la demande introuvable (version d'avant un déploiement) : on recharge sur la page visée.
      withNavigationErrorHandler((erreur) => {
        if (estModuleIntrouvable(erreur.error)) rechargerVersPageActuelle(erreur.url);
      }),
    ),
    provideHttpClient(withInterceptors([credentialsInterceptor, sessionInterceptor, resilienceInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: ErrorHandler, useClass: ClientErrorHandler },
  ],
};
