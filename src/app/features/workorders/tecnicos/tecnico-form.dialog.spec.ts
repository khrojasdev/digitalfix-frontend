import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { TecnicoFormDialog } from './tecnico-form.dialog';
import { environment } from '../../../../environments/environment';

describe('TecnicoFormDialog', () => {
  const base = environment.apiUrl;
  const cerrar = vi.fn();

  function crear(tecnico: unknown = null) {
    TestBed.configureTestingModule({
      imports: [TecnicoFormDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { tecnico } },
        { provide: MatDialogRef, useValue: { close: cerrar } },
      ],
    });
    const fixture = TestBed.createComponent(TecnicoFormDialog);
    fixture.detectChanges();
    return { c: fixture.componentInstance as any, http: TestBed.inject(HttpTestingController) };
  }

  beforeEach(() => cerrar.mockReset());

  it('crea con POST y cierra con el técnico guardado', () => {
    const { c, http } = crear();
    c.formulario.setValue({ nombre: ' Ana Rojas ', email: 'ana@digitalfix.cl', telefono: '', especialidad: 'Tableros' });
    c.guardar();
    const pedido = http.expectOne(`${base}/api/workorders/tecnicos`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ nombre: 'Ana Rojas', email: 'ana@digitalfix.cl', telefono: null, especialidad: 'Tableros' });
    pedido.flush({ id: 9, ...pedido.request.body, activo: true, fechaCreacion: '2026-10-26T10:00:00' });
    expect(cerrar).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }));
    http.verify();
  });

  it('no envía con el correo inválido', () => {
    const { c, http } = crear();
    c.formulario.setValue({ nombre: 'Ana', email: 'no-es-correo', telefono: '', especialidad: '' });
    c.guardar();
    http.expectNone(`${base}/api/workorders/tecnicos`);
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('muestra el 409 de correo repetido', () => {
    const { c, http } = crear({ id: 3, nombre: 'Ana', email: 'ana@digitalfix.cl', telefono: null, especialidad: null, activo: true, fechaCreacion: '' });
    c.guardar();
    http.expectOne(`${base}/api/workorders/tecnicos/3`).flush(
      { codigo: 'CONFLICTO', mensaje: 'Ya existe otro tecnico con el correo ana@digitalfix.cl.' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(c.error()).toContain('Ya existe otro tecnico');
    expect(cerrar).not.toHaveBeenCalled();
  });
});
