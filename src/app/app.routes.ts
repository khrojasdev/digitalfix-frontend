import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'catalog',
        loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
      },
      {
        path: 'catalog/repuestos',
        loadComponent: () =>
          import('./features/catalog/repuestos/repuestos').then((m) => m.Repuestos),
      },
    ],
  },
];
