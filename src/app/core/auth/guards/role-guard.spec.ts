import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom, isObservable, of } from 'rxjs';

import { roleGuard } from './role-guard';
import { cuentaDePrueba, proveedoresMsalDePrueba } from '../../../../testing/msal-doble';

/**
 * El guard consulta los roles de /api/me, no los del token. Con los del token
 * dejaba fuera a todo el mundo, porque Entra no incluye el claim `roles` si no
 * hay app roles asignados en el registro de la aplicacion.
 */
describe('roleGuard', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...proveedoresMsalDePrueba(cuentaDePrueba()),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  const ejecutar: CanActivateFn = (...parametros) =>
    TestBed.runInInjectionContext(() => roleGuard(...parametros));

  function ruta(roles?: string[]): ActivatedRouteSnapshot {
    return { data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot;
  }

  const estado = {} as RouterStateSnapshot;

  async function resolver(resultado: unknown): Promise<boolean | UrlTree> {
    if (isObservable(resultado)) {
      return firstValueFrom(resultado as never);
    }
    return firstValueFrom(of(resultado as boolean | UrlTree));
  }

  function responderConRoles(roles: string[]) {
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) =>
      r.flush({
        oid: 'oid-1',
        email: 'x@digitalfix.cl',
        name: 'X',
        companyId: '1',
        companyName: 'ElectroRed',
        roles,
      }),
    );
  }

  it('una ruta sin roles deja pasar sin preguntar nada', async () => {
    await expect(resolver(ejecutar(ruta(), estado))).resolves.toBe(true);
  });

  it('deja pasar a quien tiene el rol', async () => {
    const pendiente = resolver(ejecutar(ruta(['ADMIN', 'SUPERVISOR']), estado));
    responderConRoles(['SUPERVISOR']);

    await expect(pendiente).resolves.toBe(true);
  });

  it('a quien no lo tiene lo manda a acceso denegado', async () => {
    const pendiente = resolver(ejecutar(ruta(['ADMIN']), estado));
    responderConRoles(['CLIENTE']);

    const resultado = await pendiente;
    expect(resultado).not.toBe(true);
    expect(String(resultado)).toContain('acceso-denegado');
  });

  afterEach(() => {
    http.match(() => true).forEach((r) => r.flush(null));
    http.verify();
  });
});
