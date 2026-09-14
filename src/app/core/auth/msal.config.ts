import { Configuration, BrowserCacheLocation } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: '7bcc8174-7f46-4510-b2eb-c52ac3353692',
    authority: 'https://login.microsoftonline.com/05e8b5a7-b9e0-40d2-9d95-1a1ee52e838a',
    redirectUri: '/',
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
  },
};