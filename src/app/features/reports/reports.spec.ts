import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Reports } from './reports';
import { formatoDuracion } from './reportes.service';
import { environment } from '../../../environments/environment';
import { cuentaDePrueba, proveedoresMsalDePrueba } from '../../../testing/msal-doble';

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
        ...proveedoresMsalDePrueba(cuentaDePrueba()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Reports);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) => r.flush(null));
    http.verify();
  });

  function responder(periodo: string) {
    const ind = http.expectOne((r) => r.url === `${base}/api/reports/indicators`);
    expect(ind.request.params.get('periodo')).toBe(periodo);
    ind.flush({ ordenesTotales: 10, tiempoMedioResolucionMinutos: 125, conteoPorEstado: { CERRADA: 6, CANCELADA: 1, CREADA: 3 } });

    const top = http.expectOne((r) => r.url === `${base}/api/reports/top-services`);
    expect(top.request.params.get('periodo')).toBe(periodo);
    top.flush([{ servicioId: 5, cantidadSolicitudes: 4 }]);

    http.expectOne((r) => r.url === `${base}/api/catalog/services`).flush({
      content: [{ id: 5, codigo: 'SRV-005', nombre: 'Termografía', descripcion: null, tarifa: 1, activo: true }],
      totalElements: 1, totalPages: 1, number: 0, size: 500,
    });
    fixture.detectChanges();
  }

  it('pide indicadores y ranking de las últimas 24 horas al iniciar', () => {
    fixture.detectChanges();
    responder('24h');
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Reportes');
    expect(texto).toContain('Termografía');
    expect(texto).toContain('Descargar PDF');
  });

  it('calcula abiertas y tasa de cierre', () => {
    fixture.detectChanges();
    responder('24h');
    const c = fixture.componentInstance as any;
    expect(c.abiertas()).toBe(3);
    expect(c.tasaCierre()).toBe(60);
  });

  it('al elegir 7 días vuelve a pedir con ese período', () => {
    fixture.detectChanges();
    responder('24h');
    (fixture.componentInstance as any).elegirPeriodo('7d');
    responder('7d');
    expect((fixture.componentInstance as any).nombrePeriodo()).toBe('Últimos 7 días');
  });

  it('si el servicio responde 403 explica que es solo para ADMIN', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${base}/api/reports/indicators`).flush(null, { status: 403, statusText: 'Forbidden' });
    // forkJoin cancela las otras dos al fallar la primera: solo se descartan.
    http.match((r) => r.url === `${base}/api/reports/top-services`);
    http.match((r) => r.url === `${base}/api/catalog/services`);
    expect((fixture.componentInstance as any).error()).toContain('ADMIN');
  });
});

describe('formatoDuracion', () => {
  it('muestra minutos, horas y días de forma legible', () => {
    expect(formatoDuracion(null)).toBe('—');
    expect(formatoDuracion(45)).toBe('45 min');
    expect(formatoDuracion(187.4)).toBe('3 h 7 min');
    expect(formatoDuracion(120)).toBe('2 h');
    expect(formatoDuracion(60 * 26)).toBe('1 d 2 h');
  });
});
