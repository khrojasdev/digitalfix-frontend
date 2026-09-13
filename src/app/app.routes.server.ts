import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // El catalogo depende de la empresa del usuario, que sale de su token.
  // Prerenderizarlo no tiene sentido y ademas obligaria a llamar al BFF en
  // tiempo de compilacion: se renderiza en el navegador.
  {
    path: 'catalog',
    renderMode: RenderMode.Client,
  },
  {
    path: 'catalog/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
