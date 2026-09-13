import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CatalogoService } from './catalogo.service';
import { environment } from '../../../environments/environment';

describe('CatalogoService', () => {
  let servicio: CatalogoService;
  let http: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(CatalogoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide los servicios al BFF, nunca al microservicio', () => {
    servicio.listarServicios(0, 20).subscribe();

    const peticion = http.expectOne(
      (r) => r.url === `${base}/api/catalog/services` && r.method === 'GET',
    );
    expect(peticion.request.params.get('page')).toBe('0');
    expect(peticion.request.params.get('size')).toBe('20');
    expect(peticion.request.params.get('soloActivos')).toBe('true');
    peticion.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('no manda companyId en ninguna peticion: la empresa sale del token', () => {
    servicio
      .crearServicio({ codigo: 'SRV-001', nombre: 'Mantencion', descripcion: null, tarifa: 1000 })
      .subscribe();

    const peticion = http.expectOne(`${base}/api/catalog/services`);
    const cuerpo = peticion.request.body as Record<string, unknown>;
    expect(Object.keys(cuerpo)).not.toContain('companyId');
    expect(peticion.request.headers.has('X-Company-Id')).toBe(false);
    peticion.flush({
      id: 1,
      codigo: 'SRV-001',
      nombre: 'Mantencion',
      descripcion: null,
      tarifa: 1000,
      activo: true,
    });
  });

  it('desactiva en vez de borrar', () => {
    servicio.desactivarServicio(7).subscribe();

    const peticion = http.expectOne(`${base}/api/catalog/services/7`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('consulta los repuestos bajo su minimo en su propio endpoint', () => {
    servicio.repuestosBajoMinimo().subscribe();

    const peticion = http.expectOne(`${base}/api/catalog/parts/low-stock`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });
});
