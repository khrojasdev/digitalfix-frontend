import { Configuration, BrowserCacheLocation } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: 'AQUI_IRA_EL_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/AQUI_IRA_EL_TENANT_ID',
    redirectUri: '/',
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
  },
};
