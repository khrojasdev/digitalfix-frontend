import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Dashboard } from './dashboard';
import { cuentaDePrueba, proveedoresMsalDePrueba } from '../../../testing/msal-doble';

/**
 * El panel no inventa ninguna cifra: todo lo que muestra sale de tres
 * llamadas al catalogo. Estas pruebas fijan justo eso — que pide lo que dice
 * pedir, y que cuenta bien lo que le devuelven.
 */
describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...proveedoresMsalDePrueba(cuentaDePrueba()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  function responder(servicios: unknown[], totalRepuestos: number, criticos: unknown[], ordenes: unknown[] = []) {
    http.expectOne((r) => r.url.endsWith('/services')).flush({
      content: servicios,
      totalElements: servicios.length,
      totalPages: 1,
      number: 0,
      size: 200,
    });
    http.expectOne((r) => r.url.endsWith('/parts')).flush({
      content: [],
      totalElements: totalRepuestos,
      totalPages: 1,
      number: 0,
      size: 1,
    });
    http.expectOne((r) => r.url.endsWith('/parts/low-stock')).flush(criticos);
    http.expectOne((r) => r.url.endsWith('/api/workorders')).flush(ordenes);
  }

  it('se crea', () => {
    responder([], 0, []);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('pide el listado incluyendo los dados de baja', () => {
    // soloActivos=false es lo que hace posible contar los inactivos: con el
    // valor por defecto el backend ni siquiera los devuelve.
    const peticion = http.expectOne((r) => r.url.endsWith('/services'));
    expect(peticion.request.params.get('soloActivos')).toBe('false');

    peticion.flush({ content: [], totalElements: 0, totalPages: 1, number: 0, size: 200 });
    http.expectOne((r) => r.url.endsWith('/parts')).flush({
      content: [],
      totalElements: 0,
      totalPages: 1,
      number: 0,
      size: 1,
    });
    http.expectOne((r) => r.url.endsWith('/parts/low-stock')).flush([]);
    http.expectOne((r) => r.url.endsWith('/api/workorders')).flush([]);
  });

  it('cuenta las órdenes abiertas y cerradas', () => {
    responder([], 0, [], [
      { id: 1, servicioId: 1, estado: 'CREADA', asignadoA: null, comentarios: null, fechaCreacion: '2026-10-01T10:00:00', fechaActualizacion: null },
      { id: 2, servicioId: 1, estado: 'EN_EJECUCION', asignadoA: null, comentarios: null, fechaCreacion: '2026-10-02T10:00:00', fechaActualizacion: null },
      { id: 3, servicioId: 1, estado: 'CERRADA', asignadoA: null, comentarios: null, fechaCreacion: '2026-10-03T10:00:00', fechaActualizacion: null },
    ]);
    const c = fixture.componentInstance as any;
    expect(c.abiertas()).toBe(2);
    expect(c.cerradas()).toBe(1);
    expect(c.tasaCierre()).toBe(33);
    expect(c.recientes()[0].id).toBe(3);
  });

  it('si las órdenes fallan, el resto del panel se muestra igual', () => {
    http.expectOne((r) => r.url.endsWith('/services')).flush({ content: [], totalElements: 0, totalPages: 1, number: 0, size: 200 });
    http.expectOne((r) => r.url.endsWith('/parts')).flush({ content: [], totalElements: 4, totalPages: 1, number: 0, size: 1 });
    http.expectOne((r) => r.url.endsWith('/parts/low-stock')).flush([]);
    http.expectOne((r) => r.url.endsWith('/api/workorders')).flush(null, { status: 503, statusText: 'Unavailable' });
    const c = fixture.componentInstance as any;
    expect(c.error()).toBeNull();
    expect(c.ordenes()).toBeNull();
    expect(c.totalRepuestos()).toBe(4);
  });

  it('separa los servicios activos de los dados de baja', async () => {
    responder(
      [
        { id: 1, codigo: 'A', nombre: 'Uno', descripcion: null, tarifa: 1000, activo: true },
        { id: 2, codigo: 'B', nombre: 'Dos', descripcion: null, tarifa: 2000, activo: true },
        { id: 3, codigo: 'C', nombre: 'Tres', descripcion: null, tarifa: 9000, activo: false },
      ],
      12,
      [],
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Servicios activos');
    expect(texto).toContain('Servicios dados de baja');
    // el valor suma solo los activos: 1000 + 2000, nunca los 9000 del inactivo
    expect(texto).toContain('3.000');
  });

  it('avisa cuando hay repuestos bajo su minimo', async () => {
    responder(
      [],
      5,
      [
        {
          id: 9,
          sku: 'BRK-16A',
          nombre: 'Interruptor 16A',
          stock: 3,
          stockMinimo: 5,
          costoUnitario: 8900,
          activo: true,
          bajoMinimo: true,
        },
      ],
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('BRK-16A');
    expect(texto).toContain('requieren reposición');
  });

  afterEach(() => {
    // El panel muestra la empresa en el subtitulo, asi que la plantilla pide
    // /api/me ademas de lo del catalogo. Esa llamada no es lo que se prueba
    // aqui —tiene sus propias pruebas en auth-context.service.spec— pero si
    // queda sin responder, verify() falla y deja el TestBed a medio montar,
    // lo que arrastra a los specs que corren despues.
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) => r.flush(null));
    http.verify();
  });
  function rol(roles: string[]) {
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) =>
      r.flush({ oid: 'oid-1', email: 'a@b.cl', name: 'Persona', companyId: '1', companyName: 'E', roles }),
    );
  }

  function ordenesDePrueba() {
    return [
      { id: 1, servicioId: 5, estado: 'CREADA', asignadoA: null, comentarios: null, fechaCreacion: '2026-10-26T09:00:00', fechaActualizacion: null },
      { id: 2, servicioId: 5, estado: 'EN_EJECUCION', asignadoA: 'Pedro Soto', comentarios: null, fechaCreacion: '2026-10-26T08:00:00', fechaActualizacion: '2026-10-26T10:00:00' },
      { id: 3, servicioId: 5, estado: 'CERRADA', asignadoA: 'Pedro Soto', comentarios: null, fechaCreacion: '2026-10-25T08:00:00', fechaActualizacion: null },
    ];
  }

  it('el supervisor ve las órdenes por asignar y las que están en terreno', () => {
    rol(['SUPERVISOR']);
    responder([], 0, [], ordenesDePrueba());
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Por asignar');
    expect(texto).toContain('En terreno');
    const c = fixture.componentInstance as any;
    expect(c.porAsignar().map((o: any) => o.id)).toEqual([1]);
    expect(c.enTerreno().map((o: any) => o.id)).toEqual([2]);
  });

  it('el cliente ve el estado de sus órdenes, sin stock ni tareas de asignación', () => {
    rol(['CLIENTE']);
    http.match((r) => r.url.includes('/services') || r.url.includes('/parts')).forEach((r) => r.flush(r.request.url.endsWith('low-stock') ? [] : { content: [], totalElements: 0, totalPages: 1, number: 0, size: 1 }));
    http.expectOne((r) => r.url.endsWith('/api/workorders')).flush(ordenesDePrueba());
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Órdenes abiertas');
    expect(texto).not.toContain('Bajo stock mínimo');
    expect(texto).not.toContain('Por asignar');
  });
});
