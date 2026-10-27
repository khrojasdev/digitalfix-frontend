import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/http/api.service';

export interface EventoAuditoria {
  id: number;
  tipoEvento: string;
  ordenId: number | null;
  autorId: string | null;
  empresaId: number;
  fecha: string;
  correlacionId: string | null;
  eventKey: string | null;
  /** Texto legible: tecnico asignado, comentario del cambio, datos del usuario. */
  detalle?: string | null;
}

export interface PaginaEventos {
  content: EventoAuditoria[];
  totalElements: number;
}

/** Filtros que acepta ms-digitalfix-audit (todos opcionales y combinables). */
export interface FiltroAuditoria {
  tipoEvento: string;
  /** Numero de orden: arma el timeline de esa orden. */
  ordenId?: string;
  autorId: string;
  /** AAAA-MM-DD, desde el inicio del dia. */
  desde: string;
  /** AAAA-MM-DD, hasta el final del dia. */
  hasta: string;
}

export const FILTRO_AUDITORIA_VACIO: FiltroAuditoria = { tipoEvento: '', ordenId: '', autorId: '', desde: '', hasta: '' };

/**
 * Entrada del frontend a la auditoria, a traves del BFF (/api/audit).
 * El filtrado y la paginacion los hace el microservicio.
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private api = inject(ApiService);

  eventos(pagina = 0, tamano = 20, filtro: FiltroAuditoria = FILTRO_AUDITORIA_VACIO): Observable<PaginaEventos> {
    let params = new HttpParams().set('page', pagina).set('size', tamano).set('sort', 'fecha,desc');
    if (filtro.tipoEvento) params = params.set('tipoEvento', filtro.tipoEvento);
    const orden = (filtro.ordenId ?? '').trim().replace(/^#/, '');
    if (/^\d+$/.test(orden)) params = params.set('ordenId', orden);
    if (filtro.autorId.trim()) params = params.set('autorId', filtro.autorId.trim());
    if (filtro.desde) params = params.set('desde', `${filtro.desde}T00:00:00`);
    if (filtro.hasta) params = params.set('hasta', `${filtro.hasta}T23:59:59`);
    return this.api.get<PaginaEventos>('api/audit/events', params);
  }
}
