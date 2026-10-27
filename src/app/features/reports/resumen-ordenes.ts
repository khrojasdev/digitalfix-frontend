import { Orden } from '../workorders/ordenes.service';
import { Indicadores, OrdenesPorHora, Periodo, ServicioRanking } from './reportes.service';

const HORAS: Record<Periodo, number> = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };

/** Las ordenes creadas dentro del periodo, contado hacia atras desde ahora. */
export function ordenesEnPeriodo(ordenes: Orden[], periodo: Periodo, ahora: Date = new Date()): Orden[] {
  const desde = ahora.getTime() - HORAS[periodo] * 3_600_000;
  return ordenes.filter((o) => {
    const t = Date.parse(o.fechaCreacion ?? '');
    return !Number.isNaN(t) && t >= desde;
  });
}

/**
 * Indicadores calculados directamente desde las ordenes. Se usan cuando
 * ms-report no tiene datos del periodo (por ejemplo, ordenes creadas antes de
 * que el servicio de reportes estuviera conectado a RabbitMQ).
 *
 * El tiempo de resolucion de una orden cerrada se toma como la diferencia entre
 * su creacion y su ultima actualizacion, que es cuando se cerro.
 */
export function resumirOrdenes(ordenes: Orden[]): Indicadores {
  const conteoPorEstado: Record<string, number> = {};
  const duraciones: number[] = [];
  for (const o of ordenes) {
    conteoPorEstado[o.estado] = (conteoPorEstado[o.estado] ?? 0) + 1;
    if (o.estado === 'CERRADA' && o.fechaActualizacion) {
      const minutos = (Date.parse(o.fechaActualizacion) - Date.parse(o.fechaCreacion)) / 60_000;
      if (!Number.isNaN(minutos) && minutos >= 0) duraciones.push(minutos);
    }
  }
  const tiempo = duraciones.length ? duraciones.reduce((a, b) => a + b, 0) / duraciones.length : null;
  return { ordenesTotales: ordenes.length, tiempoMedioResolucionMinutos: tiempo, conteoPorEstado };
}

/** Servicios mas solicitados segun las ordenes, de mayor a menor. */
export function rankingDesdeOrdenes(ordenes: Orden[], limite = 5): ServicioRanking[] {
  const cuenta = new Map<number, number>();
  for (const o of ordenes) cuenta.set(o.servicioId, (cuenta.get(o.servicioId) ?? 0) + 1);
  return [...cuenta.entries()]
    .map(([servicioId, cantidadSolicitudes]) => ({ servicioId, cantidadSolicitudes }))
    .sort((a, b) => b.cantidadSolicitudes - a.cantidadSolicitudes || a.servicioId - b.servicioId)
    .slice(0, limite);
}

/** Ordenes por hora del dia (0 a 23) calculadas desde las ordenes, en hora local. */
export function porHoraDesdeOrdenes(ordenes: Orden[]): OrdenesPorHora[] {
  const conteo = new Array<number>(24).fill(0);
  for (const o of ordenes) {
    const fecha = new Date(o.fechaCreacion ?? '');
    if (!Number.isNaN(fecha.getTime())) conteo[fecha.getHours()]++;
  }
  return conteo.map((cantidad, hora) => ({ hora, cantidad }));
}
