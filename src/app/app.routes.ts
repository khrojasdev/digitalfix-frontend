import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [MsalGuard], // <-- Bloquea el acceso si no hay sesión
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
