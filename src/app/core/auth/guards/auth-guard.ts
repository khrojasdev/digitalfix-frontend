import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

export const authGuard: CanActivateFn = (route, state) => {
  const msalService = inject(MsalService);
  const router = inject(Router);

  // Verificamos de forma síncrona si hay cuentas cacheadas
  if (msalService.instance.getAllAccounts().length > 0) {
    return true;
  }

  // Redirige a login, guardando la URL a la que intentaba ir
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
