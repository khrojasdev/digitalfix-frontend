import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  importProvidersFrom,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
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
import { msalConfig, recursosProtegidos, scopesDeAcceso } from './core/auth/msal.config';
import { CorrelacionInterceptor } from './core/http/correlacion.interceptor';
import { paginadorEnEspanol } from './core/i18n/paginador-es';

// Fechas, miles y moneda con el formato de aquí. Sin esto, un importe sale
// como "$45,000" en vez de "$45.000".
registerLocaleData(localeEsCl);

import { MsalModule, MsalGuard, MsalInterceptor } from '@azure/msal-angular';
import { PublicClientApplication, InteractionType } from '@azure/msal-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-CL' },
    { provide: MatPaginatorIntl, useFactory: paginadorEnEspanol },
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true,
    },
    // Va después del de MSAL a propósito: no tiene sentido etiquetar una
    // petición que el interceptor de MSAL todavía puede desviar a la pantalla
    // de inicio de sesión.
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CorrelacionInterceptor,
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
          authRequest: { scopes: scopesDeAcceso },
        },
        {
          interactionType: InteractionType.Redirect,
          protectedResourceMap: recursosProtegidos,
        }
      )
    ),
  ],
};