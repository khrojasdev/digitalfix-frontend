import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Workorders } from './workorders';
import { environment } from '../../../environments/environment';

describe('Workorders', () => {
  let fixture: ComponentFixture<Workorders>;
  let http: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Workorders],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Workorders);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide las órdenes al BFF al iniciar', () => {
    fixture.detectChanges();
    const peticion = http.expectOne(`${base}/api/workorders`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra las órdenes recibidas', () => {
    fixture.detectChanges();
    http.expectOne(`${base}/api/workorders`).flush([
      {
        id: 1,
        servicioId: 5,
        estado: 'CREADA',
        asignadoA: null,
        comentarios: null,
        fechaCreacion: '2026-10-18T12:00:00',
        fechaActualizacion: null,
      },
    ]);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Órdenes de trabajo');
    expect(texto).toContain('CREADA');
  });
});
