import { EstadoOrden, Orden } from './ordenes.service';

export interface FiltroOrdenes {
  texto: string;
  estado: EstadoOrden | '';
  servicioId: number | null;
  /** AAAA-MM-DD, inclusive. */
  desde: string;
  /** AAAA-MM-DD, inclusive. */
  hasta: string;
}

export const FILTRO_VACIO: FiltroOrdenes = { texto: '', estado: '', servicioId: null, desde: '', hasta: '' };

/**
 * Filtra las ordenes en el navegador. El endpoint de ordenes devuelve todas
 * las de la empresa, asi que filtrar aqui no pierde datos.
 *
 * El texto busca en el numero de orden, el nombre del servicio, el comentario
 * y a quien esta asignada, sin distinguir mayusculas ni tildes.
 */
export function filtrarOrdenes(
  ordenes: Orden[],
  filtro: FiltroOrdenes,
  nombreServicio: (id: number) => string,
): Orden[] {
  const texto = normalizar(filtro.texto);
  return ordenes.filter((o) => {
    if (filtro.estado && o.estado !== filtro.estado) return false;
    if (filtro.servicioId !== null && o.servicioId !== filtro.servicioId) return false;

    const dia = (o.fechaCreacion ?? '').slice(0, 10);
    if (filtro.desde && dia < filtro.desde) return false;
    if (filtro.hasta && dia > filtro.hasta) return false;

    if (texto) {
      const donde = normalizar(
        [`#${o.id}`, String(o.id), nombreServicio(o.servicioId), o.comentarios ?? '', o.asignadoA ?? ''].join(' '),
      );
      if (!donde.includes(texto)) return false;
    }
    return true;
  });
}

export function hayFiltro(filtro: FiltroOrdenes): boolean {
  return !!(filtro.texto || filtro.estado || filtro.servicioId !== null || filtro.desde || filtro.hasta);
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
