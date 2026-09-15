import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CorrelacionInterceptor } from './correlacion.interceptor';
import { environment } from '../../../environments/environment';

/**
 * La cabecera de correlacion es lo que permite seguir una llamada a traves del
 * gateway, el BFF y el microservicio. Estas pruebas fijan las dos reglas que
 * importan: que va en las llamadas a la API, y que NO va en las demas —una
 * cabecera propia hacia un tercero dispara una comprobacion previa de CORS a
 * cambio de nada.
 */
describe('CorrelacionInterceptor', () => {
  let http: HttpClient;
  let pruebas: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: CorrelacionInterceptor, multi: true },
      ],
    });
    http = TestBed.inject(HttpClient);
    pruebas = TestBed.inject(HttpTestingController);
  });

  it('marca las llamadas a la API', () => {
    http.get(`${environment.apiUrl}/api/catalog/services`).subscribe();

    const peticion = pruebas.expectOne(`${environment.apiUrl}/api/catalog/services`);
    expect(peticion.request.headers.has('X-Correlation-Id')).toBe(true);
    peticion.flush({});
  });

  it('cada llamada lleva un identificador distinto', () => {
    http.get(`${environment.apiUrl}/api/catalog/services`).subscribe();
    http.get(`${environment.apiUrl}/api/catalog/parts`).subscribe();

    const a = pruebas.expectOne(`${environment.apiUrl}/api/catalog/services`);
    const b = pruebas.expectOne(`${environment.apiUrl}/api/catalog/parts`);

    expect(a.request.headers.get('X-Correlation-Id'))
      .not.toBe(b.request.headers.get('X-Correlation-Id'));

    a.flush({});
    b.flush({});
  });

  it('no toca las llamadas que no van a la API', () => {
    http.get('https://fonts.googleapis.com/css2').subscribe();

    const peticion = pruebas.expectOne('https://fonts.googleapis.com/css2');
    expect(peticion.request.headers.has('X-Correlation-Id')).toBe(false);
    peticion.flush({});
  });

  afterEach(() => pruebas.verify());
});
