import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/http/api.service';

export type EstadoOrden = 'CREADA' | 'ASIGNADA' | 'INICIADA' | 'CERRADA' | 'CANCELADA';

export interface Orden {
  id: number;
  servicioId: number;
  estado: EstadoOrden;
  asignadoA: string | null;
  comentarios: string | null;
  fechaCreacion: string;
  fechaActualizacion: string | null;
}

export interface NuevaOrden {
  servicioId: number;
  comentarios: string | null;
}

export const ESTADOS: EstadoOrden[] = ['CREADA', 'ASIGNADA', 'INICIADA', 'CERRADA', 'CANCELADA'];

/** Nombre legible de cada estado. */
export const NOMBRE_ESTADO: Record<EstadoOrden, string> = {
  CREADA: 'Creada',
  ASIGNADA: 'Asignada',
  INICIADA: 'En curso',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

/**
 * A que estados puede pasar una orden. El backend acepta cualquier cambio; el
 * frontend solo ofrece los que tienen sentido en el flujo de una mantencion,
 * y una orden cerrada o cancelada ya no se mueve.
 */
export const TRANSICIONES: Record<EstadoOrden, EstadoOrden[]> = {
  CREADA: ['ASIGNADA', 'CANCELADA'],
  ASIGNADA: ['INICIADA', 'CANCELADA'],
  INICIADA: ['CERRADA', 'CANCELADA'],
  CERRADA: [],
  CANCELADA: [],
};

export const ESTADOS_ABIERTOS: EstadoOrden[] = ['CREADA', 'ASIGNADA', 'INICIADA'];

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

  cambiarEstado(id: number, nuevoEstado: EstadoOrden): Observable<Orden> {
    // El microservicio recibe el estado como parametro de consulta.
    const params = new HttpParams().set('nuevoEstado', nuevoEstado);
    return this.api.put<Orden>(`api/workorders/${id}/estado?${params.toString()}`, {});
  }
}

/** Mensaje para la persona a partir de un error del servicio de ordenes. */
export function mensajeOrdenes(error: unknown, accion: string): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error as { mensaje?: string; message?: string } | null;
    const detalle = (cuerpo?.mensaje ?? cuerpo?.message ?? '').trim();
    if (error.status === 0) return 'No hay conexión con el servidor.';
    if (error.status === 400) return detalle || 'Los datos de la orden no son válidos.';
    if (error.status === 403) return 'Tu rol no permite esta acción.';
    if (error.status === 404) return 'La orden no existe en tu empresa.';
    if (error.status === 503) return 'El servicio de órdenes no está disponible en este momento.';
    if (detalle) return detalle;
  }
  return `No se pudo ${accion}.`;
}
