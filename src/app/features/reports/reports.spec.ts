import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Reports } from './reports';
import { environment } from '../../../environments/environment';

describe('Reports', () => {
  let fixture: ComponentFixture<Reports>;
  let http: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Reports);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide indicadores y ranking al BFF con el período por defecto', () => {
    fixture.detectChanges();

    const ind = http.expectOne((r) => r.url === `${base}/api/reports/indicators`);
    expect(ind.request.params.get('periodo')).toBe('24h');
    ind.flush({ ordenesTotales: 3, tiempoMedioResolucionMinutos: 42, conteoPorEstado: {} });

    const top = http.expectOne((r) => r.url === `${base}/api/reports/top-services`);
    expect(top.request.params.get('periodo')).toBe('24h');
    top.flush([{ servicioId: 5, cantidadSolicitudes: 2 }]);

    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Reportes');
    expect(texto).toContain('órdenes totales');
  });
});
