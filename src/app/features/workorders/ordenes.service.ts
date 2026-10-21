import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/http/api.service';

export interface Orden {
  id: number;
  servicioId: number;
  estado: string;
  asignadoA: string | null;
  comentarios: string | null;
  fechaCreacion: string;
  fechaActualizacion: string | null;
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
}
