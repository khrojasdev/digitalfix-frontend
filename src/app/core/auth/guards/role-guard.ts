import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../session.service'; // Verifica que la ruta coincida con tu estructura

export const roleGuard: CanActivateFn = (route, state) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  // Leemos el arreglo de roles permitidos que configuraremos en app.routes.ts
  const expectedRoles = route.data['roles'] as Array<string>;

  // Si la ruta no exige roles específicos, dejamos pasar
  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  // Verificamos si el usuario activo tiene al menos uno de esos roles
  if (sessionService.hasAnyRole(expectedRoles)) {
    return true;
  }

  // Si no tiene permisos, lo enviamos a una ruta de acceso denegado
  // (la página 403 visual la crearemos en la HU-07.4)
  return router.createUrlTree(['/acceso-denegado']);
};
