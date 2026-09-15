/**
 * Configuración de producción: el frontend habla con el API Gateway.
 *
 * Los tres valores de abajo son los únicos que cambian al pasar de local a
 * AWS. Estaban repartidos entre msal.config.ts y app.config.ts, escritos a
 * mano y duplicados, de modo que apuntar el frontend al gateway obligaba a
 * editar tres archivos y era fácil dejar uno atrás.
 *
 * apiUrl NO lleva /api al final: cada servicio arma su ruta completa
 * ('api/catalog/services'), y si estuviera aquí se duplicaría.
 *
 * Para desplegar contra el gateway real basta con reemplazar apiUrl por la
 * URL de invocación de la etapa. Ver docs/api-gateway.md.
 */
export const environment = {
  production: true,

  /** Raíz de la API. En producción, la URL de invocación del API Gateway. */
  apiUrl: 'https://REEMPLAZAR.execute-api.us-east-1.amazonaws.com/prod',

  azure: {
    clientId: '7bcc8174-7f46-4510-b2eb-c52ac3353692',
    tenantId: '05e8b5a7-b9e0-40d2-9d95-1a1ee52e838a',
    /** Scope que el gateway y el BFF exigen en el token. */
    apiScope: 'api://7bcc8174-7f46-4510-b2eb-c52ac3353692/access_as_user',
    /** A dónde vuelve Entra tras el inicio de sesión. */
    redirectUri: '/',
  },
};
