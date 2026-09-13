import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';

import { Catalog } from './catalog';
import { environment } from '../../../environments/environment';

describe('Catalog', () => {
  let component: Catalog;
  let fixture: ComponentFixture<Catalog>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/api/catalog/services`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Catalog);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
    http.expectOne((r) => r.url === url).flush(vacia());
  });

  it('muestra las filas que devuelve el catalogo', async () => {
    http.expectOne((r) => r.url === url).flush({
      content: [
        {
          id: 1,
          codigo: 'SRV-001',
          nombre: 'Mantencion de tablero',
          descripcion: 'Revision anual',
          tarifa: 45000,
          activo: true,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    });

    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('SRV-001');
    expect(texto).toContain('Mantencion de tablero');
  });

  it('explica el problema en vez de quedarse en blanco cuando el backend falla', async () => {
    http
      .expectOne((r) => r.url === url)
      .flush(null, { status: 503, statusText: 'Service Unavailable' });

    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('no esta disponible');
  });

  function vacia() {
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 };
  }
});
