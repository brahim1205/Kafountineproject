import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { credentialsInterceptor, resilienceInterceptor, sessionInterceptor } from './core/api/api.interceptor';
import { routes } from './app.routes';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([credentialsInterceptor, sessionInterceptor, resilienceInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};
