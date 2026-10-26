import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/auth/guards/auth-guard';
import { roleGuard } from './core/auth/guards/role-guard';
import { inicioTecnicoGuard } from './core/auth/guards/inicio-tecnico-guard';

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
        canActivate: [inicioTecnicoGuard],
        loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
      },
      {
        path: 'catalog/repuestos',
        canActivate: [roleGuard],
        // El TECNICO no entra a repuestos: el stock lo descuenta catalog al
        // asignar la orden, no el tecnico a mano.
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
        // Rol TECNICO: sus ordenes asignadas y el avance en terreno.
        path: 'mis-ordenes',
        canActivate: [roleGuard],
        data: { roles: ['TECNICO'] },
        loadComponent: () =>
          import('./features/workorders/mis-ordenes/mis-ordenes').then((m) => m.MisOrdenes),
      },
      {
        // Tecnicos de terreno: los gestiona quien asigna las ordenes.
        path: 'workorders/tecnicos',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SUPERVISOR'] },
        loadComponent: () =>
          import('./features/workorders/tecnicos/tecnicos').then((m) => m.Tecnicos),
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
        path: 'notifications',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SUPERVISOR', 'AUDITOR'] },
        loadComponent: () =>
          import('./features/notificaciones/notificaciones').then((m) => m.Notificaciones),
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
