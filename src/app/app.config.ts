import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { msalConfig } from './core/auth/msal.config';

import { MsalModule, MsalGuard, MsalInterceptor } from '@azure/msal-angular'; // <-- MsalInterceptor
import { PublicClientApplication, InteractionType } from '@azure/msal-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptorsFromDi()), // <-- Habilita interceptores clásicos
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor, // <-- Registra el interceptor de MSAL
      multi: true,
    },
    MsalGuard,
    importProvidersFrom(
      MsalModule.forRoot(
        new PublicClientApplication(msalConfig),
        {
          interactionType: InteractionType.Redirect,
          // Cambiamos 'user.read' por el scope de tu API
          authRequest: { scopes: ['api://CLIENT_ID_PENDIENTE/access_as_user'] },
        },
        {
          interactionType: InteractionType.Redirect,
          protectedResourceMap: new Map([
            ['http://localhost:8080/api/*', ['api://CLIENT_ID_PENDIENTE/access_as_user']],
          ]),
        },
      ),
    ),
  ],
};
