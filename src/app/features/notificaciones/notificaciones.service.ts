import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/http/api.service';
import { Aviso, AvisoStock } from './notificaciones.models';

/**
 * Punto de entrada del frontend a las notificaciones.
 *
 * Todas las llamadas van al BFF (/api/avisos), nunca directo a notify: el BFF
 * valida el token y propaga el contexto. Son de solo lectura.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private api = inject(ApiService);

  private static readonly AVISOS = 'api/avisos';

  /** Avisos de cambio de estado de ordenes, del mas nuevo al mas antiguo. */
  listarAvisos(): Observable<Aviso[]> {
    return this.api.get<Aviso[]>(NotificacionesService.AVISOS);
  }

  /** Avisos de stock bajo minimo. */
  listarAvisosStock(): Observable<AvisoStock[]> {
    return this.api.get<AvisoStock[]>(`${NotificacionesService.AVISOS}/stock`);
  }
}
