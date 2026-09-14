import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { AuthContextService } from './auth-context.service';
import { cuentaDePrueba, proveedoresMsalDePrueba } from '../../../testing/msal-doble';

describe('AuthContextService', () => {
  it('sin sesion no pide el perfil', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...proveedoresMsalDePrueba(null),
      ],
    });

    const servicio = TestBed.inject(AuthContextService);
    const http = TestBed.inject(HttpTestingController);

    await expect(firstValueFrom(servicio.profile$)).resolves.toBeNull();
    http.verify();
  });

  it('con sesion pide /api/me', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...proveedoresMsalDePrueba(cuentaDePrueba()),
      ],
    });

    const servicio = TestBed.inject(AuthContextService);
    const http = TestBed.inject(HttpTestingController);

    const pendiente = firstValueFrom(servicio.profile$);

    const peticion = http.expectOne((r) => r.url.endsWith('/api/me'));
    peticion.flush({
      oid: 'oid-de-prueba',
      email: 'persona@digitalfix.cl',
      name: 'Persona de Prueba',
      companyId: '1',
      companyName: null,
      roles: ['ADMIN'],
    });

    await expect(pendiente).resolves.toMatchObject({ companyId: '1' });
    http.verify();
  });

  it('si el perfil falla, la aplicacion sigue en pie', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...proveedoresMsalDePrueba(cuentaDePrueba()),
      ],
    });

    const servicio = TestBed.inject(AuthContextService);
    const http = TestBed.inject(HttpTestingController);

    const pendiente = firstValueFrom(servicio.profile$);
    http.expectOne((r) => r.url.endsWith('/api/me'))
      .flush('sin perfil', { status: 404, statusText: 'Not Found' });

    // null y no un error: la cabecera se queda sin nombre, no se rompe todo
    await expect(pendiente).resolves.toBeNull();
    http.verify();
  });
});
