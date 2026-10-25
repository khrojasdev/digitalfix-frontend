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

/** Periodos que acepta ms-digitalfix-report. */
export type Periodo = '24h' | '7d' | '30d';

export const PERIODOS: Array<{ codigo: Periodo; nombre: string }> = [
  { codigo: '24h', nombre: 'Últimas 24 horas' },
  { codigo: '7d', nombre: 'Últimos 7 días' },
  { codigo: '30d', nombre: 'Últimos 30 días' },
];

/**
 * Entrada del frontend a los reportes, a traves del BFF (/api/reports).
 */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private api = inject(ApiService);

  indicadores(periodo: Periodo = '24h'): Observable<Indicadores> {
    const params = new HttpParams().set('periodo', periodo);
    return this.api.get<Indicadores>('api/reports/indicators', params);
  }

  topServicios(periodo: Periodo = '24h'): Observable<ServicioRanking[]> {
    const params = new HttpParams().set('periodo', periodo);
    return this.api.get<ServicioRanking[]>('api/reports/top-services', params);
  }
}

/** 187.4 minutos -> "3 h 7 min". */
export function formatoDuracion(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined || Number.isNaN(minutos)) return '—';
  const total = Math.round(minutos);
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (horas < 24) return resto ? `${horas} h ${resto} min` : `${horas} h`;
  const dias = Math.floor(horas / 24);
  const horasResto = horas % 24;
  return horasResto ? `${dias} d ${horasResto} h` : `${dias} d`;
}
