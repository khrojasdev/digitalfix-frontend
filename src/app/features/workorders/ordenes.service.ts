import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/http/api.service';
import type { Tecnico } from './tecnicos/tecnicos.service';

export type EstadoOrden = 'CREADA' | 'ASIGNADA' | 'EN_DESPLAZAMIENTO' | 'EN_EJECUCION' | 'CERRADA' | 'CANCELADA';

export interface Orden {
  id: number;
  servicioId: number;
  estado: EstadoOrden;
  /** Nombre del tecnico asignado. */
  asignadoA: string | null;
  comentarios: string | null;
  fechaCreacion: string;
  fechaActualizacion: string | null;
  tecnicoId?: number | null;
  creadorId?: string | null;
}

/** Lo que ve el TECNICO: su ficha y sus ordenes. */
export interface MisOrdenes {
  tecnico: Tecnico;
  ordenes: Orden[];
}

export interface NuevaOrden {
  servicioId: number;
  comentarios: string | null;
}

/** Ciclo de vida del caso, en orden. */
export const ESTADOS: EstadoOrden[] = ['CREADA', 'ASIGNADA', 'EN_DESPLAZAMIENTO', 'EN_EJECUCION', 'CERRADA', 'CANCELADA'];

/** Nombre legible de cada estado. */
export const NOMBRE_ESTADO: Record<EstadoOrden, string> = {
  CREADA: 'Creada',
  ASIGNADA: 'Asignada',
  EN_DESPLAZAMIENTO: 'En desplazamiento',
  EN_EJECUCION: 'En ejecución',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

/**
 * Nombre de los tipos de evento (auditoria, avisos). Son los estados mas
 * INICIADA, el nombre anterior de EN_EJECUCION, que sigue en eventos antiguos.
 */
export const NOMBRE_TIPO_EVENTO: Record<string, string | undefined> = {
  ...NOMBRE_ESTADO,
  INICIADA: 'En ejecución',
};

/**
 * Cambios de estado que ofrece el menu, igual que los valida el backend.
 * ASIGNADA no esta: se logra asignando un tecnico (boton aparte).
 */
export const TRANSICIONES: Record<EstadoOrden, EstadoOrden[]> = {
  CREADA: ['CANCELADA'],
  ASIGNADA: ['EN_DESPLAZAMIENTO', 'CANCELADA'],
  EN_DESPLAZAMIENTO: ['EN_EJECUCION', 'CANCELADA'],
  EN_EJECUCION: ['CERRADA'],
  CERRADA: [],
  CANCELADA: [],
};

export const ESTADOS_ABIERTOS: EstadoOrden[] = ['CREADA', 'ASIGNADA', 'EN_DESPLAZAMIENTO', 'EN_EJECUCION'];

/**
 * El siguiente paso que marca el TECNICO en terreno, con el texto del boton.
 * null si la orden ya no tiene nada que hacer de su lado.
 */
export function pasoDelTecnico(estado: EstadoOrden): { destino: EstadoOrden; accion: string; icono: string } | null {
  switch (estado) {
    case 'ASIGNADA':
      return { destino: 'EN_DESPLAZAMIENTO', accion: 'Salir a terreno', icono: 'directions_car' };
    case 'EN_DESPLAZAMIENTO':
      return { destino: 'EN_EJECUCION', accion: 'Iniciar trabajo', icono: 'build' };
    case 'EN_EJECUCION':
      return { destino: 'CERRADA', accion: 'Cerrar orden', icono: 'task_alt' };
    default:
      return null;
  }
}

/** Se puede asignar (o reasignar) tecnico mientras la orden no sale a terreno. */
export function admiteAsignacion(estado: EstadoOrden): boolean {
  return estado === 'CREADA' || estado === 'ASIGNADA';
}

/**
 * Entrada del frontend a las ordenes de trabajo. Siempre a traves del BFF
 * (/api/workorders), que valida el token y propaga la empresa.
 */
@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private api = inject(ApiService);

  listar(): Observable<Orden[]> {
    return this.api.get<Orden[]>('api/workorders');
  }

  crear(orden: NuevaOrden): Observable<Orden> {
    return this.api.post<Orden>('api/workorders', orden);
  }

  /** PUT /api/workorders/{id}/status con {status}, como pide el caso. */
  cambiarEstado(id: number, nuevoEstado: EstadoOrden): Observable<Orden> {
    return this.api.put<Orden>(`api/workorders/${id}/status`, { status: nuevoEstado });
  }

  /** Rol TECNICO: su ficha y las ordenes que tiene asignadas. */
  misOrdenes(): Observable<MisOrdenes> {
    return this.api.get<MisOrdenes>('api/workorders/mias');
  }

  /** El supervisor asigna un tecnico: la orden pasa a ASIGNADA. */
  asignarTecnico(id: number, tecnicoId: number): Observable<Orden> {
    return this.api.put<Orden>(`api/workorders/${id}/asignacion`, { tecnicoId });
  }
}

/** Mensaje para la persona a partir de un error del servicio de ordenes. */
export function mensajeOrdenes(error: unknown, accion: string): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error as { mensaje?: string; message?: string } | null;
    const detalle = (cuerpo?.mensaje ?? cuerpo?.message ?? '').trim();
    if (error.status === 0) return 'No hay conexión con el servidor.';
    if (error.status === 400) return detalle || 'Los datos de la orden no son válidos.';
    if (error.status === 403) return detalle || 'Tu rol no permite esta acción.';
    if (error.status === 404) return detalle || 'La orden no existe en tu empresa.';
    if (error.status === 409) return detalle || 'El cambio no es válido para el estado actual de la orden.';
    if (error.status === 503) return 'El servicio de órdenes no está disponible en este momento.';
    if (detalle) return detalle;
  }
  return `No se pudo ${accion}.`;
}
