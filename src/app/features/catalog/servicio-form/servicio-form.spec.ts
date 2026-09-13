import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { ServicioForm } from './servicio-form';
import { environment } from '../../../../environments/environment';

describe('ServicioForm', () => {
  let fixture: ComponentFixture<ServicioForm>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/api/catalog/services`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicioForm],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicioForm);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('no envia nada si el formulario esta incompleto', () => {
    boton().click();
    http.expectNone(url);
  });

  it('da de alta un servicio valido', async () => {
    llenar({ codigo: 'SRV-002', nombre: 'Revision', tarifa: 30000 });
    boton().click();

    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body.codigo).toBe('SRV-002');
    // la descripcion vacia viaja como null, no como cadena vacia
    expect(peticion.request.body.descripcion).toBeNull();
    peticion.flush({
      id: 2,
      codigo: 'SRV-002',
      nombre: 'Revision',
      descripcion: null,
      tarifa: 30000,
      activo: true,
    });
  });

  it('muestra el mensaje del backend cuando el codigo ya existe', async () => {
    llenar({ codigo: 'SRV-001', nombre: 'Duplicado', tarifa: 1000 });
    boton().click();

    http.expectOne(url).flush(
      { error: 'conflicto', message: 'ya existe un servicio con el codigo SRV-001' },
      { status: 409, statusText: 'Conflict' },
    );

    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('ya existe un servicio con el codigo SRV-001');
  });

  function llenar(valores: { codigo: string; nombre: string; tarifa: number }) {
    const componente = fixture.componentInstance as unknown as {
      formulario: {
        setValue: (v: Record<string, unknown>) => void;
      };
    };
    componente.formulario.setValue({
      codigo: valores.codigo,
      nombre: valores.nombre,
      descripcion: '',
      tarifa: valores.tarifa,
    });
    fixture.detectChanges();
  }

  function boton(): HTMLButtonElement {
    const elemento = fixture.nativeElement as HTMLElement;
    return elemento.querySelector('button[type="submit"]') as HTMLButtonElement;
  }
});
