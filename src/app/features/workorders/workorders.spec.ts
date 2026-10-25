import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Workorders } from './workorders';
import { environment } from '../../../environments/environment';
import { cuentaDePrueba, proveedoresMsalDePrueba } from '../../../testing/msal-doble';

const ORDENES = [
  { id: 1, servicioId: 5, estado: 'CREADA', asignadoA: null, comentarios: 'Tablero sala 2', fechaCreacion: '2026-10-18T12:00:00', fechaActualizacion: null },
  { id: 2, servicioId: 6, estado: 'INICIADA', asignadoA: 'tecnico-1', comentarios: null, fechaCreacion: '2026-10-19T09:30:00', fechaActualizacion: '2026-10-19T10:00:00' },
  { id: 3, servicioId: 5, estado: 'CERRADA', asignadoA: null, comentarios: null, fechaCreacion: '2026-10-20T08:00:00', fechaActualizacion: null },
];

const SERVICIOS = {
  content: [
    { id: 5, codigo: 'SRV-001', nombre: 'Mantención preventiva de tablero', descripcion: null, tarifa: 45000, activo: true },
    { id: 6, codigo: 'SRV-002', nombre: 'Termografía de tablero', descripcion: null, tarifa: 85000, activo: true },
  ],
  totalElements: 2, totalPages: 1, number: 0, size: 500,
};

describe('Workorders', () => {
  let fixture: ComponentFixture<Workorders>;
  let http: HttpTestingController;
  const base = environment.apiUrl;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function cargar(roles = ['ADMIN']) {
    fixture.detectChanges();
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) =>
      r.flush({ oid: 'o', email: 'e', name: 'n', companyId: '1', companyName: 'E', roles }),
    );
    http.expectOne(`${base}/api/workorders`).flush(ORDENES);
    http.expectOne((r) => r.url === `${base}/api/catalog/services`).flush(SERVICIOS);
    fixture.detectChanges();
  }

  async function configurar(roles = ['ADMIN']) {
    await TestBed.configureTestingModule({
      imports: [Workorders],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...proveedoresMsalDePrueba(cuentaDePrueba(roles)),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Workorders);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) => r.flush(null));
    http.verify();
  });

  it('pide órdenes y servicios, y muestra el nombre del servicio en vez del id', async () => {
    await configurar();
    cargar();
    expect(texto()).toContain('Órdenes de trabajo');
    expect(texto()).toContain('Mantención preventiva de tablero');
    expect(texto()).toContain('En curso');
  });

  it('calcula los indicadores de abiertas, cerradas y canceladas', async () => {
    await configurar();
    cargar();
    const c = fixture.componentInstance as any;
    expect(c.total()).toBe(3);
    expect(c.abiertas()).toBe(2);
    expect(c.cerradas()).toBe(1);
    expect(c.canceladas()).toBe(0);
  });

  it('filtra por estado y por texto', async () => {
    await configurar();
    cargar();
    const c = fixture.componentInstance as any;
    c.actualizarFiltro({ estado: 'CERRADA' });
    expect(c.filtradas().map((o: any) => o.id)).toEqual([3]);

    c.limpiarFiltros();
    c.actualizarFiltro({ texto: 'termografia' });
    expect(c.filtradas().map((o: any) => o.id)).toEqual([2]);
  });

  it('cambia el estado con PUT y actualiza la fila', async () => {
    await configurar();
    cargar();
    const c = fixture.componentInstance as any;
    c.cambiarEstado(ORDENES[0], 'ASIGNADA');

    const put = http.expectOne((r) => r.url.startsWith(`${base}/api/workorders/1/estado`));
    expect(put.request.method).toBe('PUT');
    expect(put.request.url).toContain('nuevoEstado=ASIGNADA');
    put.flush({ ...ORDENES[0], estado: 'ASIGNADA' });

    expect(c.ordenes().find((o: any) => o.id === 1).estado).toBe('ASIGNADA');
  });

  it('un AUDITOR no ve el botón de nueva orden', async () => {
    await configurar(['AUDITOR']);
    cargar(['AUDITOR']);
    expect(texto()).not.toContain('Nueva orden');
  });

  it('un ADMIN sí ve el botón de nueva orden', async () => {
    await configurar(['ADMIN']);
    cargar(['ADMIN']);
    expect(texto()).toContain('Nueva orden');
  });
});
