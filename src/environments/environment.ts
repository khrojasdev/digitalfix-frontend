export const environment = {
  production: true,
  // Sin /api al final: cada servicio ya arma su ruta completa
  // (por ejemplo 'api/catalog/services'). Si se dejara aqui, se duplicaria.
  apiUrl: 'https://api.midominio.com',
};
