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

  function responder(servicios: unknown[], totalRepuestos: number, criticos: unknown[]) {
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
});
