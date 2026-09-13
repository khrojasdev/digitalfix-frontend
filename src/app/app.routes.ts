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
    ],
  },
];
