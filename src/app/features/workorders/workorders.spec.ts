import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { HttpErrorResponse } from '@angular/common/http';

import { Workorders, mensajeCatalogo } from './workorders';
import { environment } from '../../../environments/environment';
import { cuentaDePrueba, proveedoresMsalDePrueba } from '../../../testing/msal-doble';

const ORDENES = [
  { id: 1, servicioId: 5, estado: 'CREADA', asignadoA: null, comentarios: 'Tablero sala 2', fechaCreacion: '2026-10-18T12:00:00', fechaActualizacion: null },
  { id: 2, servicioId: 6, estado: 'EN_EJECUCION', asignadoA: 'tecnico-1', comentarios: null, fechaCreacion: '2026-10-19T09:30:00', fechaActualizacion: '2026-10-19T10:00:00' },
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
    expect(texto()).toContain('En ejecución');
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

  it('cambia el estado con PUT /status y actualiza la fila', async () => {
    await configurar();
    cargar();
    const c = fixture.componentInstance as any;
    c.cambiarEstado(ORDENES[1], 'CERRADA');

    const put = http.expectOne(`${base}/api/workorders/2/status`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ status: 'CERRADA' });
    put.flush({ ...ORDENES[1], estado: 'CERRADA' });

    expect(c.ordenes().find((o: any) => o.id === 2).estado).toBe('CERRADA');
  });

  it('muestra el motivo cuando el backend rechaza la transición', async () => {
    await configurar();
    cargar();
    const c = fixture.componentInstance as any;
    const aviso = vi.spyOn((c as any).aviso, 'open');
    c.cambiarEstado(ORDENES[0], 'EN_EJECUCION');
    http.expectOne(`${base}/api/workorders/1/status`).flush(
      { codigo: 'TRANSICION_INVALIDA', mensaje: 'No se puede pasar a EN_EJECUCION sin ASIGNAR un tecnico.' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(aviso).toHaveBeenCalledWith('No se puede pasar a EN_EJECUCION sin ASIGNAR un tecnico.', 'Cerrar', expect.anything());
    expect(c.ordenes().find((o: any) => o.id === 1).estado).toBe('CREADA');
  });

  it('el menú de estado no ofrece ASIGNADA ni saltarse etapas', async () => {
    await configurar();
    cargar();
    const c = fixture.componentInstance as any;
    expect(c.transiciones['CREADA']).toEqual(['CANCELADA']);
    expect(c.transiciones['ASIGNADA']).toEqual(['EN_DESPLAZAMIENTO', 'CANCELADA']);
    expect(c.transiciones['EN_DESPLAZAMIENTO']).toEqual(['EN_EJECUCION', 'CANCELADA']);
    expect(c.transiciones['EN_EJECUCION']).toEqual(['CERRADA']);
  });

  it('si la orden sale del filtro y la página queda vacía, vuelve a una con filas', async () => {
    await configurar();
    cargar();
    const c = fixture.componentInstance as any;
    c.tamano.set(1);
    c.actualizarFiltro({ estado: 'CREADA' });
    expect(c.filtradas()).toHaveLength(1);
    c.cambiarEstado(ORDENES[0], 'CANCELADA');
    http.expectOne(`${base}/api/workorders/1/status`).flush({ ...ORDENES[0], estado: 'CANCELADA' });
    expect(c.filtradas()).toHaveLength(0);
    expect(c.pagina()).toBe(0);
  });

  it('ofrece Asignar en las creadas y Reasignar en las asignadas, no en las que ya salieron', async () => {
    await configurar();
    cargar();
    const c = fixture.componentInstance as any;
    expect(c.admiteAsignacion('CREADA')).toBe(true);
    expect(c.admiteAsignacion('ASIGNADA')).toBe(true);
    expect(c.admiteAsignacion('EN_DESPLAZAMIENTO')).toBe(false);
    expect(texto()).toContain('Asignar');
    expect(texto()).toContain('Sin asignar');
  });

  it('al cerrar la asignación actualiza la fila con el técnico', async () => {
    await configurar();
    cargar();
    const c = fixture.componentInstance as any;
    const asignada = { ...ORDENES[0], estado: 'ASIGNADA', asignadoA: 'Ana Rojas', tecnicoId: 1 };
    vi.spyOn(c.dialogo, 'open').mockReturnValue({ afterClosed: () => ({ subscribe: (fn: any) => fn(asignada) }) });
    c.asignar(ORDENES[0]);
    expect(c.ordenes().find((o: any) => o.id === 1).asignadoA).toBe('Ana Rojas');
    fixture.detectChanges();
    expect(texto()).toContain('Ana Rojas');
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
  it('si falla el listado de órdenes, los servicios del catálogo igual quedan disponibles', async () => {
    await configurar(['ADMIN']);
    fixture.detectChanges();
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) =>
      r.flush({ oid: 'o', email: 'e', name: 'n', companyId: '1', companyName: 'E', roles: ['ADMIN'] }),
    );
    http.expectOne(`${base}/api/workorders`).flush({ mensaje: 'caido' }, { status: 503, statusText: 'Service Unavailable' });
    http.expectOne((r) => r.url === `${base}/api/catalog/services`).flush(SERVICIOS);
    fixture.detectChanges();

    const componente = fixture.componentInstance as unknown as { serviciosActivos: () => unknown[]; error: () => string | null };
    expect(componente.serviciosActivos().length).toBe(2);
    expect(componente.error()).toContain('no está disponible');
  });

  it('si el catálogo no se puede leer, guarda el motivo en vez de dar la lista por vacía', async () => {
    await configurar(['ADMIN']);
    fixture.detectChanges();
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) =>
      r.flush({ oid: 'o', email: 'e', name: 'n', companyId: '1', companyName: 'E', roles: ['ADMIN'] }),
    );
    http.expectOne(`${base}/api/workorders`).flush(ORDENES);
    http.expectOne((r) => r.url === `${base}/api/catalog/services`).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    const componente = fixture.componentInstance as unknown as { errorCatalogo: () => string | null };
    expect(componente.errorCatalogo()).toContain('permiso');
  });

  it('pide el catálogo con un tamaño de página razonable', async () => {
    await configurar(['ADMIN']);
    fixture.detectChanges();
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) => r.flush(null));
    http.expectOne(`${base}/api/workorders`).flush(ORDENES);
    const pedido = http.expectOne((r) => r.url === `${base}/api/catalog/services`);
    expect(pedido.request.params.get('size')).toBe('100');
    pedido.flush(SERVICIOS);
  });
});

describe('mensajeCatalogo', () => {
  const err = (status: number) => new HttpErrorResponse({ status });
  it('explica cada causa en lenguaje claro', () => {
    expect(mensajeCatalogo(err(403))).toContain('permiso');
    expect(mensajeCatalogo(err(503))).toContain('no está disponible');
    expect(mensajeCatalogo(err(0))).toContain('conexión');
    expect(mensajeCatalogo(err(500))).toContain('500');
  });
});
