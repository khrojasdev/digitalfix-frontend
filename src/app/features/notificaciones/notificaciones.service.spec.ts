import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { NotificacionesService } from './notificaciones.service';
import { environment } from '../../../environments/environment';

describe('NotificacionesService', () => {
  let servicio: NotificacionesService;
  let http: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(NotificacionesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide los avisos de estado al BFF', () => {
    servicio.listarAvisos().subscribe();

    const peticion = http.expectOne(`${base}/api/avisos`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('pide los avisos de stock en su propio endpoint', () => {
    servicio.listarAvisosStock().subscribe();

    const peticion = http.expectOne(`${base}/api/avisos/stock`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('no manda companyId: la empresa sale del token', () => {
    servicio.listarAvisos().subscribe();

    const peticion = http.expectOne(`${base}/api/avisos`);
    expect(peticion.request.headers.has('X-Company-Id')).toBe(false);
    peticion.flush([]);
  });
});
