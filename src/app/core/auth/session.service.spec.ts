import { TestBed } from '@angular/core/testing';

import { SessionService } from './session.service';
import { cuentaDePrueba, proveedoresMsalDePrueba } from '../../../testing/msal-doble';

describe('SessionService', () => {
  it('sin cuenta activa no hay usuario', () => {
    TestBed.configureTestingModule({ providers: [...proveedoresMsalDePrueba(null)] });
    const servicio = TestBed.inject(SessionService);

    expect(servicio.hasRole('ADMIN')).toBe(false);
    expect(servicio.hasAnyRole(['ADMIN', 'SUPERVISOR'])).toBe(false);
  });

  it('con cuenta activa expone los roles del token', () => {
    TestBed.configureTestingModule({
      providers: [...proveedoresMsalDePrueba(cuentaDePrueba(['SUPERVISOR']))],
    });
    const servicio = TestBed.inject(SessionService);

    expect(servicio.hasRole('SUPERVISOR')).toBe(true);
    expect(servicio.hasRole('ADMIN')).toBe(false);
    expect(servicio.hasAnyRole(['ADMIN', 'SUPERVISOR'])).toBe(true);
  });
});
