import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { msalConfig } from './core/auth/msal.config';

import { MsalModule } from '@azure/msal-angular';
import { PublicClientApplication, InteractionType } from '@azure/msal-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(),
    importProvidersFrom(
      MsalModule.forRoot(
        new PublicClientApplication(msalConfig),
        {
          interactionType: InteractionType.Redirect,
          authRequest: { scopes: ['user.read'] },
        },
        {
          interactionType: InteractionType.Redirect,
          protectedResourceMap: new Map(),
        },
      ),
    ),
  ],
};
