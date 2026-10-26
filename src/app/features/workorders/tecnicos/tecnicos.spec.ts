import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Tecnicos } from './tecnicos';
import { environment } from '../../../../environments/environment';

const TECNICOS = [
  { id: 1, nombre: 'Ana Rojas', email: 'ana@digitalfix.cl', telefono: '+56911112222', especialidad: 'Tableros', activo: true, fechaCreacion: '2026-10-20T10:00:00' },
  { id: 2, nombre: 'Pedro Soto', email: 'pedro@digitalfix.cl', telefono: null, especialidad: 'Termografía', activo: false, fechaCreacion: '2026-10-21T10:00:00' },
];

describe('Tecnicos', () => {
  let fixture: ComponentFixture<Tecnicos>;
  let http: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tecnicos],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(Tecnicos);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function cargar() {
    fixture.detectChanges();
    http.expectOne(`${base}/api/workorders/tecnicos`).flush(TECNICOS);
    fixture.detectChanges();
  }

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('lista los técnicos activos y oculta los desactivados', () => {
    cargar();
    expect(texto()).toContain('Ana Rojas');
    expect(texto()).not.toContain('Pedro Soto');
    expect(texto()).toContain('1 activos de 2');
  });

  it('muestra los desactivados al pedirlo y busca sin importar tildes', () => {
    cargar();
    const c = fixture.componentInstance as any;
    c.verInactivos.set(true);
    c.texto.set('termografia');
    expect(c.visibles().map((t: any) => t.id)).toEqual([2]);
  });

  it('desactiva con DELETE y actualiza la fila', () => {
    cargar();
    const c = fixture.componentInstance as any;
    c.desactivar(TECNICOS[0]);
    const pedido = http.expectOne(`${base}/api/workorders/tecnicos/1`);
    expect(pedido.request.method).toBe('DELETE');
    pedido.flush({ ...TECNICOS[0], activo: false });
    expect(c.activos()).toBe(0);
  });

  it('reactiva con PUT activo=true', () => {
    cargar();
    const c = fixture.componentInstance as any;
    c.reactivar(TECNICOS[1]);
    const pedido = http.expectOne(`${base}/api/workorders/tecnicos/2`);
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body.activo).toBe(true);
    pedido.flush({ ...TECNICOS[1], activo: true });
    expect(c.activos()).toBe(2);
  });

  it('explica el 403 sin culpar a la persona', () => {
    fixture.detectChanges();
    http.expectOne(`${base}/api/workorders/tecnicos`).flush(null, { status: 403, statusText: 'Forbidden' });
    expect((fixture.componentInstance as any).error()).toContain('administrador o supervisor');
  });
});
