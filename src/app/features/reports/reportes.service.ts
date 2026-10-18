import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/http/api.service';

export interface Indicadores {
  ordenesTotales: number;
  tiempoMedioResolucionMinutos: number | null;
  conteoPorEstado: Record<string, number>;
}

export interface ServicioRanking {
  servicioId: number;
  cantidadSolicitudes: number;
}

/**
 * Entrada del frontend a los reportes, a traves del BFF (/api/reports).
 */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private api = inject(ApiService);

  indicadores(periodo = '24h'): Observable<Indicadores> {
    const params = new HttpParams().set('periodo', periodo);
    return this.api.get<Indicadores>('api/reports/indicators', params);
  }

  topServicios(periodo = '24h'): Observable<ServicioRanking[]> {
    const params = new HttpParams().set('periodo', periodo);
    return this.api.get<ServicioRanking[]>('api/reports/top-services', params);
  }
}
