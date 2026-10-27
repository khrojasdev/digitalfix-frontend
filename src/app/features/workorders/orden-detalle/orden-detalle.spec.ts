import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { OrdenDetalle } from './orden-detalle';
import { AuthContextService } from '../../../core/auth/auth-context.service';
import { environment } from '../../../../environments/environment';

const ORDEN = { id: 7, servicioId: 5, estado: 'ASIGNADA', asignadoA: 'Pedro Soto', comentarios: 'Av. Brasil 123', fechaCreacion: '2026-10-26T09:00:00', fechaActualizacion: null, tecnicoId: 4 };
const HISTORIAL = [
  { estadoAnterior: null, estadoNuevo: 'CREADA', autorNombre: 'Cliente Uno', comentario: null, fecha: '2026-10-26T09:00:00' },
  { estadoAnterior: 'CREADA', estadoNuevo: 'ASIGNADA', autorNombre: 'Supervisor', comentario: 'Pedro está cerca', fecha: '2026-10-26T09:30:00' },
];
const SERVICIO = { id: 5, codigo: 'SRV-001', nombre: 'Mantención de tablero', descripcion: null, tarifa: 1, activo: true };

describe('OrdenDetalle', () => {
  let fixture: ComponentFixture<OrdenDetalle>;
  let http: HttpTestingController;
  const base = environment.apiUrl;
  const abrir = vi.fn();

  function crear(roles: string[], id = '7') {
    TestBed.configureTestingModule({
      imports: [OrdenDetalle],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
        { provide: AuthContextService, useValue: { tieneAlguno$: (buscados: string[]) => of(buscados.some((r) => roles.includes(r))) } },
        { provide: MatDialog, useValue: { open: abrir } },
      ],
    });
    fixture = TestBed.createComponent(OrdenDetalle);
    http = TestBed.inject(HttpTestingController);
  }

  function cargar(orden: object = ORDEN, historial: object[] = HISTORIAL) {
    fixture.detectChanges();
    http.expectOne(`${base}/api/workorders/7`).flush({ orden, historial });
    http.expectOne(`${base}/api/catalog/services/5`).flush(SERVICIO);
    fixture.detectChanges();
  }

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(() => abrir.mockReset());
  afterEach(() => http.verify());

  it('muestra los datos y el historial con autor y comentario, del más reciente al más antiguo', () => {
    crear(['SUPERVISOR']);
    cargar();
    expect(texto()).toContain('Orden #7');
    expect(texto()).toContain('SRV-001 · Mantención de tablero');
    expect(texto()).toContain('Pedro está cerca');
    expect(texto()).toContain('Cliente Uno');
    const pasos = (fixture.nativeElement as HTMLElement).querySelectorAll('.paso');
    expect(pasos).toHaveLength(2);
    expect(pasos[0].textContent).toContain('Supervisor');
  });

  it('el técnico ve solo su siguiente paso y lo confirma con comentario opcional', () => {
    crear(['TECNICO']);
    cargar();
    expect(texto()).toContain('Salir a terreno');
    expect(texto()).not.toContain('Reasignar técnico');

    abrir.mockReturnValue({ afterClosed: () => of({ comentario: 'Voy en camino' }) });
    (fixture.componentInstance as any).cambiarA('EN_DESPLAZAMIENTO', 'Salir a terreno');
    const put = http.expectOne(`${base}/api/workorders/7/status`);
    expect(put.request.body).toEqual({ status: 'EN_DESPLAZAMIENTO', comentario: 'Voy en camino' });
    put.flush({ ...ORDEN, estado: 'EN_DESPLAZAMIENTO' });
    // vuelve a cargar el detalle para mostrar el paso nuevo
    cargar({ ...ORDEN, estado: 'EN_DESPLAZAMIENTO' });
    expect(texto()).toContain('Iniciar trabajo');
  });

  it('sin comentario el cambio de estado no manda la clave comentario', () => {
    crear(['ADMIN']);
    cargar();
    abrir.mockReturnValue({ afterClosed: () => of({ comentario: null }) });
    (fixture.componentInstance as any).cambiarA('EN_DESPLAZAMIENTO');
    const put = http.expectOne(`${base}/api/workorders/7/status`);
    expect(put.request.body).toEqual({ status: 'EN_DESPLAZAMIENTO' });
    put.flush(ORDEN);
    cargar();
  });

  it('si se cancela el diálogo no cambia nada', () => {
    crear(['ADMIN']);
    cargar();
    abrir.mockReturnValue({ afterClosed: () => of(undefined) });
    (fixture.componentInstance as any).cambiarA('CERRADA');
    http.expectNone(`${base}/api/workorders/7/status`);
  });

  it('ADMIN ve el enlace a la auditoría de la orden; el cliente no', () => {
    crear(['ADMIN']);
    cargar();
    expect(texto()).toContain('Ver en auditoría');
    TestBed.resetTestingModule();

    crear(['CLIENTE']);
    cargar();
    expect(texto()).not.toContain('Ver en auditoría');
    expect(texto()).not.toContain('Salir a terreno');
  });

  it('si la orden no es visible para el rol muestra el error del backend', () => {
    crear(['CLIENTE']);
    fixture.detectChanges();
    http.expectOne(`${base}/api/workorders/7`).flush({ mensaje: 'La orden 7 no existe' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(texto()).toContain('La orden 7 no existe');
  });

  it('un número de orden inválido no llama al backend', () => {
    crear(['ADMIN'], 'abc');
    fixture.detectChanges();
    expect(texto()).toContain('El número de orden no es válido.');
  });
});
