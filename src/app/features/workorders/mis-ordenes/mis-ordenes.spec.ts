import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MisOrdenes } from './mis-ordenes';
import { environment } from '../../../../environments/environment';

const TECNICO = { id: 4, nombre: 'Pedro Soto', email: 'pedro@digitalfix.cl', telefono: null, especialidad: 'Tableros', activo: true, fechaCreacion: '', cuentaVinculada: true };
const ORDENES = [
  { id: 10, servicioId: 5, estado: 'ASIGNADA', asignadoA: 'Pedro Soto', comentarios: 'Av. Brasil 123, Valparaíso', fechaCreacion: '2026-10-26T09:00:00', fechaActualizacion: null, tecnicoId: 4 },
  { id: 11, servicioId: 5, estado: 'EN_EJECUCION', asignadoA: 'Pedro Soto', comentarios: null, fechaCreacion: '2026-10-25T09:00:00', fechaActualizacion: null, tecnicoId: 4 },
  { id: 12, servicioId: 6, estado: 'CERRADA', asignadoA: 'Pedro Soto', comentarios: null, fechaCreacion: '2026-10-20T09:00:00', fechaActualizacion: null, tecnicoId: 4 },
];
const SERVICIOS = { content: [{ id: 5, codigo: 'SRV-001', nombre: 'Mantención de tablero', descripcion: null, tarifa: 1, activo: true }], totalElements: 1 };

describe('MisOrdenes', () => {
  let fixture: ComponentFixture<MisOrdenes>;
  let http: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisOrdenes],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(MisOrdenes);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function cargar(respuesta: object = { tecnico: TECNICO, ordenes: ORDENES }) {
    fixture.detectChanges();
    http.expectOne(`${base}/api/workorders/mias`).flush(respuesta);
    http.expectOne((r) => r.url === `${base}/api/catalog/services`).flush(SERVICIOS);
    fixture.detectChanges();
  }

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('muestra solo las pendientes con el siguiente paso de cada una', () => {
    cargar();
    expect(texto()).toContain('Pedro Soto');
    expect(texto()).toContain('Mantención de tablero');
    expect(texto()).toContain('Av. Brasil 123');
    expect(texto()).toContain('Salir a terreno');
    expect(texto()).toContain('Cerrar orden');
    expect(texto()).not.toContain('#12');
  });

  it('la vista Todas incluye las cerradas', () => {
    cargar();
    const c = fixture.componentInstance as any;
    c.vista.set('todas');
    fixture.detectChanges();
    expect(texto()).toContain('#12');
    expect(c.cerradas()).toBe(1);
    expect(c.enTerreno()).toBe(1);
  });

  it('salir a terreno marca EN_DESPLAZAMIENTO con PUT /status', () => {
    cargar();
    const c = fixture.componentInstance as any;
    c.avanzar(ORDENES[0]);
    const put = http.expectOne(`${base}/api/workorders/10/status`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ status: 'EN_DESPLAZAMIENTO' });
    put.flush({ ...ORDENES[0], estado: 'EN_DESPLAZAMIENTO' });
    fixture.detectChanges();
    expect(texto()).toContain('Iniciar trabajo');
  });

  it('cerrar una orden en ejecución la saca de pendientes', () => {
    cargar();
    const c = fixture.componentInstance as any;
    c.avanzar(ORDENES[1]);
    const put = http.expectOne(`${base}/api/workorders/11/status`);
    expect(put.request.body).toEqual({ status: 'CERRADA' });
    put.flush({ ...ORDENES[1], estado: 'CERRADA' });
    expect(c.pendientes().map((o: any) => o.id)).toEqual([10]);
  });

  it('sin ficha de técnico explica qué pedirle al supervisor', () => {
    fixture.detectChanges();
    http.expectOne(`${base}/api/workorders/mias`).flush(
      { codigo: 'RECURSO_NO_ENCONTRADO', mensaje: 'Tu cuenta (nuevo@digitalfix.cl) no esta registrada como tecnico en tu empresa. Pide al supervisor que te agregue con ese correo.' },
      { status: 404, statusText: 'Not Found' },
    );
    http.expectOne((r) => r.url === `${base}/api/catalog/services`).flush(SERVICIOS);
    fixture.detectChanges();
    expect(texto()).toContain('Pide al supervisor que te agregue');
    expect(texto()).not.toContain('Pendientes');
  });
});
