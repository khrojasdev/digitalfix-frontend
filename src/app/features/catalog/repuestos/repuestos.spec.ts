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
  const urlBajoMinimo = `${url}/low-stock`;

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
    http.expectOne(urlBajoMinimo).flush([]);

    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('BRK-16A');
    expect(texto).toContain('Interruptor 16A');
  });

  it('avisa cuando la empresa todavia no tiene repuestos', async () => {
    http.expectOne((r) => r.url === url).flush(pagina([]));
    http.expectOne(urlBajoMinimo).flush([]);

    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('todavía no tiene repuestos');
  });

  it('destaca la fila del repuesto que esta en o bajo su minimo', async () => {
    http.expectOne((r) => r.url === url).flush(pagina([interruptor()]));
    http.expectOne(urlBajoMinimo).flush([interruptor()]);

    await fixture.whenStable();
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelectorAll('tr.bajo-minimo').length).toBe(1);
    expect(elemento.textContent).toContain('en o bajo su stock mínimo');
  });

  it('al filtrar por bajo minimo consulta el endpoint dedicado, no el listado', async () => {
    http.expectOne((r) => r.url === url).flush(pagina([interruptor()]));
    http.expectOne(urlBajoMinimo).flush([interruptor()]);
    await fixture.whenStable();

    const componente = fixture.componentInstance as unknown as {
      alternarBajoMinimo: (v: boolean) => void;
    };
    componente.alternarBajoMinimo(true);

    // una sola peticion, y al endpoint de bajo minimo
    http.expectNone((r) => r.url === url && r.method === 'GET' && !r.url.endsWith('low-stock'));
    http.expectOne(urlBajoMinimo).flush([interruptor()]);

    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tr.bajo-minimo').length).toBe(1);
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
