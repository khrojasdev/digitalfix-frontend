/**
 * Modelos del catalogo. Reflejan exactamente lo que devuelve el BFF en
 * /api/catalog/**, que a su vez viene de ms-digitalfix-catalog.
 *
 * Ninguno lleva companyId: la empresa la resuelve el backend desde el token.
 * Si el cliente la mandara, el backend la descarta.
 */

/** Pagina de Spring Data tal como llega serializada. */
export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface Servicio {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tarifa: number;
  activo: boolean;
}

/** Cuerpo de alta y edicion de un servicio. */
export interface ServicioSolicitud {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tarifa: number;
}

export interface Repuesto {
  id: number;
  sku: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  costoUnitario: number | null;
  activo: boolean;
  /** Lo calcula el backend: stock <= stockMinimo. */
  bajoMinimo: boolean;
}

export interface RepuestoSolicitud {
  sku: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  costoUnitario: number | null;
}

/** Un repuesto y su cantidad dentro de un servicio. */
export interface RepuestoDeServicio {
  repuestoId: number;
  cantidad: number;
}

export interface RepuestoDeServicioRespuesta {
  repuestoId: number;
  sku: string;
  nombre: string;
  cantidad: number;
  stockDisponible: number;
}

/** Cuerpo uniforme de error del backend. */
export interface RespuestaError {
  error: string;
  message: string;
  timestamp: string;
  path: string;
  detalles: string[] | null;
}
