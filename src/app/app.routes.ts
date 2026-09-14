import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/auth/guards/auth-guard'; // <-- Importa tu nuevo guard

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard], // <-- Reemplaza MsalGuard por authGuard
    children: [
      {
        path: '',
        redirectTo: '/catalog',
        pathMatch: 'full',
      },
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
  {
    path: '**',
    redirectTo: '/catalog',
  },
];
