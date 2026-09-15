/**
 * Configuración de desarrollo: el frontend habla directo con el BFF.
 *
 * En local no hay gateway, así que apiUrl apunta al BFF en el 8080 y el CORS
 * lo resuelve el propio BFF con su perfil local. Al desplegar, el gateway
 * ocupa ese lugar y el BFF deja de estar expuesto.
 */
export const environment = {
  production: false,

  apiUrl: 'http://localhost:8080',

  azure: {
    clientId: '7bcc8174-7f46-4510-b2eb-c52ac3353692',
    tenantId: '05e8b5a7-b9e0-40d2-9d95-1a1ee52e838a',
    apiScope: 'api://7bcc8174-7f46-4510-b2eb-c52ac3353692/access_as_user',
    redirectUri: '/',
  },
};
