import { ordenesEnPeriodo, rankingDesdeOrdenes, resumirOrdenes } from './resumen-ordenes';
import { Orden } from '../workorders/ordenes.service';

const ahora = new Date('2026-10-25T12:00:00');
const orden = (id: number, servicioId: number, estado: string, creada: string, actualizada: string | null = null): Orden =>
  ({ id, servicioId, estado, asignadoA: null, comentarios: null, fechaCreacion: creada, fechaActualizacion: actualizada }) as Orden;

describe('resumen de ordenes', () => {
  const lista = [
    orden(1, 5, 'CERRADA', '2026-10-25T08:00:00', '2026-10-25T10:00:00'),
    orden(2, 5, 'CREADA', '2026-10-24T20:00:00'),
    orden(3, 9, 'CANCELADA', '2026-10-20T08:00:00'),
    orden(4, 9, 'CERRADA', '2026-10-01T08:00:00', '2026-10-01T09:00:00'),
  ];

  it('filtra por período hacia atrás desde ahora', () => {
    expect(ordenesEnPeriodo(lista, '24h', ahora).map((o) => o.id)).toEqual([1, 2]);
    expect(ordenesEnPeriodo(lista, '7d', ahora).map((o) => o.id)).toEqual([1, 2, 3]);
    expect(ordenesEnPeriodo(lista, '30d', ahora).map((o) => o.id)).toEqual([1, 2, 3, 4]);
  });

  it('cuenta por estado y promedia el tiempo de las cerradas', () => {
    const r = resumirOrdenes(lista);
    expect(r.ordenesTotales).toBe(4);
    expect(r.conteoPorEstado).toEqual({ CERRADA: 2, CREADA: 1, CANCELADA: 1 });
    expect(r.tiempoMedioResolucionMinutos).toBe(90);
  });

  it('sin cerradas, el tiempo medio queda vacío', () => {
    expect(resumirOrdenes([orden(2, 5, 'CREADA', '2026-10-24T20:00:00')]).tiempoMedioResolucionMinutos).toBeNull();
  });

  it('arma el ranking de servicios de mayor a menor', () => {
    expect(rankingDesdeOrdenes([...lista, orden(5, 9, 'CREADA', '2026-10-25T09:00:00')])).toEqual([
      { servicioId: 9, cantidadSolicitudes: 3 },
      { servicioId: 5, cantidadSolicitudes: 2 },
    ]);
  });
});
