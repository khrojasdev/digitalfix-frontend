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
        // Al catalogo y no al panel: el panel esta cerrado a CLIENTE, y
        // mandar a alguien a una pantalla que su rol no puede ver significa
        // que entra a la aplicacion y lo primero que lee es "acceso denegado".
        path: '',
        redirectTo: '/catalog',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SUPERVISOR', 'AUDITOR'] },
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
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
        // Pantallas de fases posteriores. Se enrutan igual, con una vista que
        // dice qué falta y qué hará, en vez de dejar el enlace muerto: así la
        // navegación completa se puede recorrer y revisar.
        path: 'workorders',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SUPERVISOR', 'AUDITOR', 'CLIENTE'] },
        loadComponent: () =>
          import('./features/workorders/workorders').then((m) => m.Workorders),
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SUPERVISOR'] },
        loadComponent: () => import('./features/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'audit',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'AUDITOR'] },
        loadComponent: () => import('./features/audit/audit').then((m) => m.Audit),
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
