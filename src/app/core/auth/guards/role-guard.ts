import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';

import { AuthContextService } from '../auth-context.service';

/**
 * Deja pasar si la persona tiene alguno de los roles que pide la ruta.
 *
 * Los roles se consultan a AuthContextService, no al token: vienen de
 * APP_USER, que es donde vive la relación persona-empresa-rol. Leerlos del
 * token dejaba fuera a todo el mundo cuando Entra no incluía el claim
 * `roles`, que es lo habitual si no hay app roles asignados.
 *
 * Por eso el guard es asíncrono: el perfil llega por HTTP. `take(1)` es
 * importante — sin él el guard nunca completa y la navegación se queda
 * colgada esperando un segundo valor que no llega.
 */
export const roleGuard: CanActivateFn = (route) => {
  const authContext = inject(AuthContextService);
  const router = inject(Router);

  const esperados = route.data['roles'] as Array<string> | undefined;

  // Si la ruta no exige roles específicos, dejamos pasar
  if (!esperados || esperados.length === 0) {
    return true;
  }

  return authContext.tieneAlguno$(esperados).pipe(
    take(1),
    map((puede) => puede || router.createUrlTree(['/acceso-denegado'])),
  );
};
