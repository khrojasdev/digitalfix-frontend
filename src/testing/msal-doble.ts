import { Provider } from '@angular/core';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { AccountInfo, InteractionStatus } from '@azure/msal-browser';
import { BehaviorSubject, Subject } from 'rxjs';

/**
 * Doble de MSAL para las pruebas.
 *
 * Casi todo lo que se prueba aqui cuelga, directa o indirectamente, de
 * MsalService: la cabecera, el layout, el servicio de sesion. Sin un doble,
 * cada spec falla con NG0201 antes de llegar a probar nada, y peor: un
 * MsalService de verdad intentaria abrir una redireccion a Microsoft desde
 * las pruebas.
 *
 * Se pasa la cuenta que se quiere simular, o null para simular que no hay
 * sesion iniciada.
 */
export function proveedoresMsalDePrueba(cuenta: AccountInfo | null = null): Provider[] {
  const instancia = {
    getActiveAccount: () => cuenta,
    setActiveAccount: () => undefined,
    getAllAccounts: () => (cuenta ? [cuenta] : []),
    initialize: () => Promise.resolve(),
    handleRedirectPromise: () => Promise.resolve(null),
  };

  return [
    {
      provide: MsalService,
      useValue: {
        instance: instancia,
        loginRedirect: () => undefined,
        logoutRedirect: () => undefined,
      },
    },
    {
      provide: MsalBroadcastService,
      useValue: {
        // None significa "no hay ninguna interaccion en curso": es el estado
        // en que SessionService lee la cuenta activa.
        inProgress$: new BehaviorSubject<InteractionStatus>(InteractionStatus.None),
        msalSubject$: new Subject(),
      },
    },
  ];
}

/** Una cuenta de mentira, con los claims que mira la aplicacion. */
export function cuentaDePrueba(roles: string[] = ['ADMIN']): AccountInfo {
  return {
    homeAccountId: 'cuenta-de-prueba',
    environment: 'login.microsoftonline.com',
    tenantId: 'tenant-de-prueba',
    username: 'persona@digitalfix.cl',
    localAccountId: 'oid-de-prueba',
    name: 'Persona de Prueba',
    idTokenClaims: { roles, scp: 'access_as_user' },
  } as AccountInfo;
}
