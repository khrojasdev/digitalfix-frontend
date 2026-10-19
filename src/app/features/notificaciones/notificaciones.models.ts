/**
 * Modelos de los avisos que expone el BFF en /api/avisos, y que vienen de
 * ms-digitalfix-notify al consumir la mensajeria.
 */

export interface Aviso {
  ordenId: number;
  tipoEvento: string;
  mensaje: string;
  empresaId: number;
  fechaEvento: string;
  fechaAviso: string;
}

export interface AvisoStock {
  repuestoId: number;
  sku: string;
  mensaje: string;
  empresaId: number;
  fechaAviso: string;
}
