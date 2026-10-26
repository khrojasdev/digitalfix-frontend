import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { AsignarTecnicoDialog } from './asignar-tecnico.dialog';
import { environment } from '../../../environments/environment';

const TECNICOS = [
  { id: 1, nombre: 'Ana Rojas', email: 'ana@digitalfix.cl', telefono: null, especialidad: 'Tableros', activo: true, fechaCreacion: '' },
  { id: 2, nombre: 'Pedro Soto', email: 'pedro@digitalfix.cl', telefono: null, especialidad: null, activo: true, fechaCreacion: '' },
];
const ORDEN = { id: 7, servicioId: 5, estado: 'CREADA', asignadoA: null, comentarios: null, fechaCreacion: '', fechaActualizacion: null, tecnicoId: null };

describe('AsignarTecnicoDialog', () => {
  const base = environment.apiUrl;
  const cerrar = vi.fn();

  function crear(orden: unknown = ORDEN) {
    TestBed.configureTestingModule({
      imports: [AsignarTecnicoDialog],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { orden, servicio: 'Mantención de tablero' } },
        { provide: MatDialogRef, useValue: { close: cerrar } },
      ],
    });
    const fixture = TestBed.createComponent(AsignarTecnicoDialog);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    return { fixture, c: fixture.componentInstance as any, http };
  }

  beforeEach(() => cerrar.mockReset());

  it('pide solo los técnicos activos y asigna con PUT /asignacion', () => {
    const { c, http } = crear();
    const lista = http.expectOne((r) => r.url === `${base}/api/workorders/tecnicos`);
    expect(lista.request.params.get('soloActivos')).toBe('true');
    lista.flush(TECNICOS);

    c.tecnico.setValue(2);
    c.asignar();
    const put = http.expectOne(`${base}/api/workorders/7/asignacion`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ tecnicoId: 2 });
    put.flush({ ...ORDEN, estado: 'ASIGNADA', asignadoA: 'Pedro Soto', tecnicoId: 2 });
    expect(cerrar).toHaveBeenCalledWith(expect.objectContaining({ estado: 'ASIGNADA' }));
    http.verify();
  });

  it('al reasignar no ofrece al técnico actual y si queda uno lo elige solo', () => {
    const { c, http } = crear({ ...ORDEN, estado: 'ASIGNADA', asignadoA: 'Ana Rojas', tecnicoId: 1 });
    http.expectOne((r) => r.url === `${base}/api/workorders/tecnicos`).flush(TECNICOS);
    expect(c.reasignando).toBe(true);
    expect(c.opciones().map((t: any) => t.id)).toEqual([2]);
    expect(c.tecnico.value).toBe(2);
  });

  it('sin técnicos activos avisa y no deja asignar', () => {
    const { fixture, c, http } = crear();
    http.expectOne((r) => r.url === `${base}/api/workorders/tecnicos`).flush([]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay técnicos activos');
    expect(c.tecnico.invalid).toBe(true);
  });

  it('muestra el motivo si el backend rechaza la asignación', () => {
    const { c, http } = crear();
    http.expectOne((r) => r.url === `${base}/api/workorders/tecnicos`).flush(TECNICOS);
    c.tecnico.setValue(1);
    c.asignar();
    http.expectOne(`${base}/api/workorders/7/asignacion`).flush(
      { codigo: 'TRANSICION_INVALIDA', mensaje: 'El tecnico Ana Rojas esta desactivado.' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(c.error()).toBe('El tecnico Ana Rojas esta desactivado.');
    expect(cerrar).not.toHaveBeenCalled();
  });
});
