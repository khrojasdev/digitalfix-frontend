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

  /** Fecha ISO local (sin zona) de hace n horas, como la entrega workorders. */
  function haceHoras(n: number): string {
    const d = new Date(Date.now() - n * 3_600_000);
    const p = (x: number) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
  }

  let ordenes: unknown[] = [];

  function responder(periodo: string) {
    const ind = http.expectOne((r) => r.url === `${base}/api/reports/indicators`);
    expect(ind.request.params.get('periodo')).toBe(periodo);
    ind.flush({ ordenesTotales: 10, tiempoMedioResolucionMinutos: 125, conteoPorEstado: { CERRADA: 6, CANCELADA: 1, CREADA: 3 } });

    const top = http.expectOne((r) => r.url === `${base}/api/reports/top-services`);
    expect(top.request.params.get('periodo')).toBe(periodo);
    top.flush([{ servicioId: 5, cantidadSolicitudes: 4 }]);

    http.expectOne(`${base}/api/workorders`).flush(ordenes);
    http.expectOne((r) => r.url === `${base}/api/catalog/services`).flush({
      content: [{ id: 5, codigo: 'SRV-005', nombre: 'Termografía', descripcion: null, tarifa: 1, activo: true }],
      totalElements: 1, totalPages: 1, number: 0, size: 100,
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
    // forkJoin cancela la otra al fallar la primera: solo se descarta.
    http.match((r) => r.url === `${base}/api/reports/top-services`);
    http.expectOne(`${base}/api/workorders`).flush([]);
    http.match((r) => r.url === `${base}/api/catalog/services`);
    expect((fixture.componentInstance as any).error()).toContain('ADMIN');
  });

  it('muestra las órdenes del período y permite filtrarlas por estado y servicio', () => {
    ordenes = [
      { id: 7, servicioId: 5, estado: 'CREADA', asignadoA: null, comentarios: null, fechaCreacion: haceHoras(1), fechaActualizacion: null },
      { id: 6, servicioId: 9, estado: 'ASIGNADA', asignadoA: 'tecnico-1', comentarios: null, fechaCreacion: haceHoras(2), fechaActualizacion: haceHoras(1) },
      { id: 1, servicioId: 5, estado: 'CERRADA', asignadoA: null, comentarios: null, fechaCreacion: haceHoras(24 * 10), fechaActualizacion: haceHoras(24 * 9) },
    ];
    fixture.detectChanges();
    responder('24h');
    const c = fixture.componentInstance as any;

    // la orden de hace 10 dias no entra en las ultimas 24 horas
    expect(c.ordenesPeriodo().map((o: any) => o.id)).toEqual([7, 6]);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Órdenes del período');
    expect(texto).toContain('#7');

    c.filtroEstado.set('ASIGNADA');
    expect(c.ordenesFiltradas().map((o: any) => o.id)).toEqual([6]);
    c.limpiarFiltrosOrdenes();
    c.filtroServicio.set(5);
    expect(c.ordenesFiltradas().map((o: any) => o.id)).toEqual([7]);
    ordenes = [];
  });

  it('si ms-report no tiene datos del período, calcula los indicadores desde las órdenes', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${base}/api/reports/indicators`).flush({ ordenesTotales: 0, tiempoMedioResolucionMinutos: null, conteoPorEstado: {} });
    http.expectOne((r) => r.url === `${base}/api/reports/top-services`).flush([]);
    http.expectOne(`${base}/api/workorders`).flush([
      { id: 7, servicioId: 5, estado: 'CREADA', asignadoA: null, comentarios: null, fechaCreacion: haceHoras(1), fechaActualizacion: null },
      { id: 6, servicioId: 5, estado: 'ASIGNADA', asignadoA: null, comentarios: null, fechaCreacion: haceHoras(2), fechaActualizacion: null },
    ]);
    http.match((r) => r.url === `${base}/api/catalog/services`).forEach((r) => r.flush(null));
    fixture.detectChanges();

    const c = fixture.componentInstance as any;
    expect(c.fuente()).toBe('ordenes');
    expect(c.indicadores().ordenesTotales).toBe(2);
    expect(c.ranking()).toEqual([{ servicioId: 5, cantidadSolicitudes: 2 }]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('calculados desde las órdenes');
  });

  it('si ms-report contó menos órdenes que las del período, lo avisa', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${base}/api/reports/indicators`).flush({ ordenesTotales: 1, tiempoMedioResolucionMinutos: null, conteoPorEstado: { CREADA: 1 } });
    http.expectOne((r) => r.url === `${base}/api/reports/top-services`).flush([]);
    http.expectOne(`${base}/api/workorders`).flush([
      { id: 7, servicioId: 5, estado: 'CREADA', asignadoA: null, comentarios: null, fechaCreacion: haceHoras(1), fechaActualizacion: null },
      { id: 6, servicioId: 5, estado: 'CREADA', asignadoA: null, comentarios: null, fechaCreacion: haceHoras(2), fechaActualizacion: null },
    ]);
    http.match((r) => r.url === `${base}/api/catalog/services`).forEach((r) => r.flush(null));
    fixture.detectChanges();

    const c = fixture.componentInstance as any;
    expect(c.fuente()).toBe('report');
    expect(c.faltanEnReport()).toBe(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('registró 1 de 2 órdenes');
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
