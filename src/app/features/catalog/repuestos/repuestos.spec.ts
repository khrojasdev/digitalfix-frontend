import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';

import { Repuestos } from './repuestos';
import { environment } from '../../../../environments/environment';

describe('Repuestos', () => {
  let fixture: ComponentFixture<Repuestos>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/api/catalog/parts`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Repuestos],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Repuestos);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lista los repuestos con su stock y su minimo', async () => {
    http.expectOne((r) => r.url === url).flush(pagina([interruptor()]));

    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('BRK-16A');
    expect(texto).toContain('Interruptor 16A');
  });

  it('avisa cuando la empresa todavia no tiene repuestos', async () => {
    http.expectOne((r) => r.url === url).flush(pagina([]));

    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('todavia no tiene repuestos');
  });

  function interruptor() {
    return {
      id: 1,
      sku: 'BRK-16A',
      nombre: 'Interruptor 16A',
      stock: 3,
      stockMinimo: 5,
      costoUnitario: 8900,
      activo: true,
      bajoMinimo: true,
    };
  }

  function pagina(content: unknown[]) {
    return { content, totalElements: content.length, totalPages: 1, number: 0, size: 20 };
  }
});
