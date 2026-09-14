import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/auth/guards/auth-guard';
import { roleGuard } from './core/auth/guards/role-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
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
        canActivate: [roleGuard],
        // Los roles del caso son ADMIN, SUPERVISOR, CLIENTE y AUDITOR. TECNICO
        // no existe: dejarlo aqui no abria nada, pero la lista quedaba sin los
        // roles que si tienen que entrar a repuestos.
        data: { roles: ['ADMIN', 'SUPERVISOR', 'AUDITOR'] },
        loadComponent: () =>
          import('./features/catalog/repuestos/repuestos').then((m) => m.Repuestos),
      },
      {
        path: 'acceso-denegado',
        loadComponent: () =>
          import('./features/auth/access-denied/access-denied.component').then(
            (m) => m.AccessDeniedComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/catalog',
  },
];
