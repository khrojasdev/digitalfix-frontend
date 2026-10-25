import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { NuevaOrdenDialog } from './nueva-orden.dialog';
import { environment } from '../../../environments/environment';

describe('NuevaOrdenDialog', () => {
  let http: HttpTestingController;
  const cerrar = vi.fn();

  beforeEach(async () => {
    cerrar.mockReset();
    await TestBed.configureTestingModule({
      imports: [NuevaOrdenDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: cerrar } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { servicios: [{ id: 5, codigo: 'SRV-001', nombre: 'Mantención', descripcion: null, tarifa: 1, activo: true }] },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('no envía nada si no se eligió servicio', () => {
    const fixture = TestBed.createComponent(NuevaOrdenDialog);
    fixture.detectChanges();
    (fixture.componentInstance as any).guardar();
    http.expectNone(`${environment.apiUrl}/api/workorders`);
  });

  it('crea la orden con POST y cierra el diálogo con la orden creada', () => {
    const fixture = TestBed.createComponent(NuevaOrdenDialog);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.formulario.setValue({ servicioId: 5, comentarios: '  Tablero sala 2  ' });
    c.guardar();

    const post = http.expectOne(`${environment.apiUrl}/api/workorders`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ servicioId: 5, comentarios: 'Tablero sala 2' });

    const creada = { id: 9, servicioId: 5, estado: 'CREADA' };
    post.flush(creada);
    expect(cerrar).toHaveBeenCalledWith(creada);
  });

  it('muestra el mensaje del backend si rechaza la orden', () => {
    const fixture = TestBed.createComponent(NuevaOrdenDialog);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.formulario.setValue({ servicioId: 5, comentarios: '' });
    c.guardar();
    http
      .expectOne(`${environment.apiUrl}/api/workorders`)
      .flush({ codigo: 'X', mensaje: 'El ID del servicio es obligatorio' }, { status: 400, statusText: 'Bad Request' });
    expect(c.error()).toBe('El ID del servicio es obligatorio');
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('si el catálogo no se pudo leer, muestra el motivo y no dice que no hay servicios', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [NuevaOrdenDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: cerrar } },
        { provide: MAT_DIALOG_DATA, useValue: { servicios: [], errorCatalogo: 'Tu usuario no tiene permiso para leer el catálogo.' } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(NuevaOrdenDialog);
    f.detectChanges();
    const texto = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('no tiene permiso');
    expect(texto).not.toContain('No hay servicios activos');
  });
});
