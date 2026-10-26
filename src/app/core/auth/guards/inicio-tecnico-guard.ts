import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';

import { AuthContextService } from '../auth-context.service';

/** Roles que trabajan desde el catalogo. Quien tiene alguno se queda ahi. */
const ROLES_DE_OFICINA = ['ADMIN', 'SUPERVISOR', 'AUDITOR', 'CLIENTE'];

/**
 * La aplicacion entra por /catalog (despues del login y en la ruta vacia).
 * Un TECNICO no trabaja con el catalogo: lo suyo son sus ordenes, asi que se
 * lo lleva a /mis-ordenes. Si ademas tiene otro rol, se queda en el catalogo.
 */
export const inicioTecnicoGuard: CanActivateFn = () => {
  const authContext = inject(AuthContextService);
  const router = inject(Router);

  return authContext.roles$.pipe(
    take(1),
    map((roles) => {
      const soloTecnico = roles.includes('TECNICO') && !roles.some((r) => ROLES_DE_OFICINA.includes(r));
      return soloTecnico ? router.createUrlTree(['/mis-ordenes']) : true;
    }),
  );
};
