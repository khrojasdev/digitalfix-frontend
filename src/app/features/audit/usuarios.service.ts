import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, shareReplay } from 'rxjs';

import { ApiService } from '../../core/http/api.service';

/** Lo minimo de una persona para mostrarla: viene de GET /api/usuarios/{oid}. */
export interface UsuarioResumen {
  oid: string;
  nombre: string | null;
  email: string | null;
  rol: string | null;
}

/**
 * Nombre y correo de las personas a partir de su oid, para no mostrar el
 * identificador de Entra ID en pantalla.
 *
 * Cada oid se pide una sola vez por sesion. Si el BFF no lo encuentra (o no
 * tiene el endpoint), se responde null y la pantalla muestra el oid acortado.
 */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(ApiService);
  private readonly cache = new Map<string, Observable<UsuarioResumen | null>>();

  resumen(oid: string): Observable<UsuarioResumen | null> {
    let pedido = this.cache.get(oid);
    if (!pedido) {
      pedido = this.api.get<UsuarioResumen>(`api/usuarios/${encodeURIComponent(oid)}`).pipe(
        catchError(() => of(null)),
        shareReplay(1),
      );
      this.cache.set(oid, pedido);
    }
    return pedido;
  }
}
