import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  importProvidersFrom,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';

import { routes } from './app.routes';
import { msalConfig } from './core/auth/msal.config';
import { environment } from '../environments/environment';

import { MsalModule, MsalGuard, MsalInterceptor } from '@azure/msal-angular';
import { PublicClientApplication, InteractionType } from '@azure/msal-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true,
    },
    MsalGuard,
    // INICIO DEL ARREGLO: Inicializador de MSAL
    provideAppInitializer(() => {
      const msal = inject(MsalService);
      return msal.instance
        .initialize()
        .then(() => msal.instance.handleRedirectPromise())
        .then((resultado) => {
          if (resultado?.account) {
            msal.instance.setActiveAccount(resultado.account);
          } else {
            const cuentas = msal.instance.getAllAccounts();
            if (cuentas.length > 0) msal.instance.setActiveAccount(cuentas[0]);
          }
        });
    }),
    // FIN DEL ARREGLO
    importProvidersFrom(
      MsalModule.forRoot(
        new PublicClientApplication(msalConfig),
        {
          interactionType: InteractionType.Redirect,
          // Recuerda cambiar CLIENT_ID_PENDIENTE por tu Client ID real de Azure
          authRequest: { scopes: ['api://7bcc8174-7f46-4510-b2eb-c52ac3353692/access_as_user'] },
        },
        {
          interactionType: InteractionType.Redirect,
          protectedResourceMap: new Map([
            [
              `${environment.apiUrl}/*`,
              ['api://7bcc8174-7f46-4510-b2eb-c52ac3353692/access_as_user'],
            ],
          ]),
        }
      )
    ),
  ],
};