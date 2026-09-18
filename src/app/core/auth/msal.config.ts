import { BrowserCacheLocation, Configuration } from '@azure/msal-browser';

import { environment } from '../../../environments/environment';

/**
 * Configuración de MSAL, armada desde el entorno.
 *
 * El identificador de la aplicación y el del tenant estaban escritos aquí a
 * mano, y el scope otra vez —dos veces más— en app.config.ts. Cambiar de
 * entorno obligaba a tocar tres archivos y a acertar en los tres. Ahora todo
 * sale de environment.
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: environment.azure.clientId,
    authority: `https://login.microsoftonline.com/${environment.azure.tenantId}`,
    redirectUri: environment.azure.redirectUri,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
  },
};

/**
 * Qué direcciones llevan el token y con qué scope.
 *
 * Solo la raíz de la API: el token no se adjunta a ninguna otra llamada. Si se
 * adjuntara a todas, cualquier petición a un tercero se llevaría la credencial
 * de la persona.
 */
export const recursosProtegidos = new Map<string, string[]>([
  [`${environment.apiUrl}/*`, [environment.azure.apiScope]],
]);

/** Scopes que se piden al iniciar sesión. */
export const scopesDeAcceso = [environment.azure.apiScope];
