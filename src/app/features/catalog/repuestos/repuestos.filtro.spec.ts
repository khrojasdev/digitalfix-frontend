import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Repuestos } from './repuestos';
import { environment } from '../../../../environments/environment';

describe('Repuestos · filtros', () => {
  let fixture: ComponentFixture<Repuestos>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/api/catalog/parts`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Repuestos],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Repuestos);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const r = (id: number, sku: string, nombre: string, activo: boolean) =>
      ({ id, sku, nombre, stock: 5, stockMinimo: 2, costoUnitario: 1000, activo, bajoMinimo: false });
    http.expectOne((req) => req.url === url).flush({
      content: [r(1, 'BRK-16A', 'Interruptor 16A', true), r(2, 'CAB-25', 'Cable 2,5 mm', false)],
      totalElements: 2, totalPages: 1, number: 0, size: 20,
    });
    http.expectOne(`${url}/low-stock`).flush([]);
  });

  afterEach(() => http.verify());

  it('busca por SKU o nombre', () => {
    const c = fixture.componentInstance as any;
    c.texto.set('brk');
    expect(c.visibles().map((x: any) => x.id)).toEqual([1]);
    c.texto.set('cable');
    expect(c.visibles().map((x: any) => x.id)).toEqual([2]);
  });

  it('filtra por activos e inactivos', () => {
    const c = fixture.componentInstance as any;
    c.estado.set('inactivos');
    expect(c.visibles().map((x: any) => x.id)).toEqual([2]);
    c.estado.set('activos');
    expect(c.visibles().map((x: any) => x.id)).toEqual([1]);
  });
});
