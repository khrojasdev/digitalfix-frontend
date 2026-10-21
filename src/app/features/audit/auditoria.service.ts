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
}

export interface PaginaEventos {
  content: EventoAuditoria[];
  totalElements: number;
}

/**
 * Entrada del frontend a la auditoria, a traves del BFF (/api/audit).
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private api = inject(ApiService);

  eventos(pagina = 0, tamano = 20): Observable<PaginaEventos> {
    const params = new HttpParams().set('page', pagina).set('size', tamano);
    return this.api.get<PaginaEventos>('api/audit/events', params);
  }
}
