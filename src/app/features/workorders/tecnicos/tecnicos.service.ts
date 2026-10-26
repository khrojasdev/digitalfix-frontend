import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/http/api.service';

/**
 * Tecnico de terreno de la empresa. Es un recurso que el supervisor asigna a
 * las ordenes; no inicia sesion (recibe el ticket de despacho por correo).
 */
export interface Tecnico {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  especialidad: string | null;
  activo: boolean;
  fechaCreacion: string;
}

export interface DatosTecnico {
  nombre: string;
  email: string;
  telefono: string | null;
  especialidad: string | null;
  /** Solo al editar: true reactiva, false desactiva, sin valor no cambia. */
  activo?: boolean;
}

/** /api/workorders/tecnicos a traves del BFF. Solo ADMIN y SUPERVISOR. */
@Injectable({ providedIn: 'root' })
export class TecnicosService {
  private readonly api = inject(ApiService);

  listar(soloActivos = false): Observable<Tecnico[]> {
    const params = soloActivos ? new HttpParams().set('soloActivos', 'true') : undefined;
    return this.api.get<Tecnico[]>('api/workorders/tecnicos', params);
  }

  crear(datos: DatosTecnico): Observable<Tecnico> {
    return this.api.post<Tecnico>('api/workorders/tecnicos', datos);
  }

  actualizar(id: number, datos: DatosTecnico): Observable<Tecnico> {
    return this.api.put<Tecnico>(`api/workorders/tecnicos/${id}`, datos);
  }

  /** Baja logica: deja de ofrecerse para asignar, pero se conserva. */
  desactivar(id: number): Observable<Tecnico> {
    return this.api.delete<Tecnico>(`api/workorders/tecnicos/${id}`);
  }
}

/** Mensaje para la persona a partir de un error del servicio de tecnicos. */
export function mensajeTecnicos(error: unknown, accion: string): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error as { mensaje?: string; message?: string } | null;
    const detalle = (cuerpo?.mensaje ?? cuerpo?.message ?? '').trim();
    if (error.status === 0) return 'No hay conexión con el servidor.';
    if (error.status === 400) return detalle || 'Los datos del técnico no son válidos.';
    if (error.status === 403) return 'Solo un administrador o supervisor puede gestionar técnicos.';
    if (error.status === 404) return 'El técnico no existe en tu empresa.';
    if (error.status === 409) return detalle || 'Ya existe un técnico con ese correo.';
    if (error.status === 503) return 'El servicio de órdenes no está disponible en este momento.';
    if (detalle) return detalle;
  }
  return `No se pudo ${accion}.`;
}
