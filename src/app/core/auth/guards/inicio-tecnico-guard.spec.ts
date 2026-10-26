import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable, firstValueFrom } from 'rxjs';

import { inicioTecnicoGuard } from './inicio-tecnico-guard';
import { cuentaDePrueba, proveedoresMsalDePrueba } from '../../../../testing/msal-doble';

describe('inicioTecnicoGuard', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), ...proveedoresMsalDePrueba(cuentaDePrueba())],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function resultadoCon(roles: string[]): Promise<boolean | UrlTree> {
    const resultado = TestBed.runInInjectionContext(() =>
      inicioTecnicoGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    const promesa = firstValueFrom(resultado);
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) =>
      r.flush({ oid: 'o', email: 'e', name: 'n', companyId: '1', companyName: 'E', roles }),
    );
    return promesa;
  }

  it('al TECNICO lo lleva a Mis órdenes', async () => {
    const r = await resultadoCon(['TECNICO']);
    expect(r instanceof UrlTree).toBe(true);
    expect((r as UrlTree).toString()).toBe('/mis-ordenes');
  });

  it('a los demás roles los deja en el catálogo', async () => {
    expect(await resultadoCon(['SUPERVISOR'])).toBe(true);
  });

  it('si además de TECNICO tiene otro rol, se queda en el catálogo', async () => {
    expect(await resultadoCon(['TECNICO', 'ADMIN'])).toBe(true);
  });
});
