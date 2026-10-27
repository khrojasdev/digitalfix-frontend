import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { CambioEstadoDialog } from './cambio-estado.dialog';

describe('CambioEstadoDialog', () => {
  const cerrar = vi.fn();

  function crear(datos: object = { ordenId: 7, destino: 'EN_EJECUCION' }) {
    TestBed.configureTestingModule({
      imports: [CambioEstadoDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: { close: cerrar } },
      ],
    });
    const fixture = TestBed.createComponent(CambioEstadoDialog);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance as any };
  }

  beforeEach(() => cerrar.mockReset());

  it('muestra la orden y el estado de destino', () => {
    const { fixture } = crear();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Orden #7');
    expect(texto).toContain('Comentario (opcional)');
  });

  it('el comentario es opcional: sin texto confirma con null', () => {
    const { c } = crear();
    c.confirmar();
    expect(cerrar).toHaveBeenCalledWith({ comentario: null });
  });

  it('devuelve el comentario sin espacios sobrantes', () => {
    const { c } = crear();
    c.comentario.setValue('  Se cambió el disyuntor  ');
    c.confirmar();
    expect(cerrar).toHaveBeenCalledWith({ comentario: 'Se cambió el disyuntor' });
  });

  it('no confirma un comentario de más de 500 caracteres', () => {
    const { c } = crear();
    c.comentario.setValue('x'.repeat(501));
    c.confirmar();
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('usa el texto de acción que recibe', () => {
    const { fixture } = crear({ ordenId: 3, destino: 'CERRADA', accion: 'Cerrar orden' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cerrar orden');
  });
});
