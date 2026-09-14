import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/http/api.service';
import {
  Pagina,
  Repuesto,
  RepuestoDeServicio,
  RepuestoDeServicioRespuesta,
  RepuestoSolicitud,
  Servicio,
  ServicioSolicitud,
} from './catalogo.models';

/**
 * Unico punto de entrada del frontend al catalogo.
 *
 * Todas las llamadas van al BFF, nunca directo al microservicio: el BFF es
 * quien valida el token, resuelve la empresa y propaga el contexto. Por eso
 * aqui no se arma ninguna cabecera de empresa ni se manda companyId.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private api = inject(ApiService);

  private static readonly SERVICIOS = 'api/catalog/services';
  private static readonly REPUESTOS = 'api/catalog/parts';

  // ---------------------------------------------------------------- servicios

  listarServicios(pagina = 0, tamano = 20, soloActivos = true): Observable<Pagina<Servicio>> {
    const params = new HttpParams()
      .set('page', pagina)
      .set('size', tamano)
      .set('soloActivos', soloActivos);
    return this.api.get<Pagina<Servicio>>(CatalogoService.SERVICIOS, params);
  }

  obtenerServicio(id: number): Observable<Servicio> {
    return this.api.get<Servicio>(`${CatalogoService.SERVICIOS}/${id}`);
  }

  crearServicio(solicitud: ServicioSolicitud): Observable<Servicio> {
    return this.api.post<Servicio>(CatalogoService.SERVICIOS, solicitud);
  }

  actualizarServicio(id: number, solicitud: ServicioSolicitud): Observable<Servicio> {
    return this.api.put<Servicio>(`${CatalogoService.SERVICIOS}/${id}`, solicitud);
  }

  /** En el catalogo nada se borra: se desactiva. */
  desactivarServicio(id: number): Observable<void> {
    return this.api.delete<void>(`${CatalogoService.SERVICIOS}/${id}`);
  }

  /**
   * Deshace una baja. Devuelve el servicio ya actualizado, asi que quien
   * llama puede refrescar la fila sin volver a pedir el listado entero.
   */
  reactivarServicio(id: number): Observable<Servicio> {
    return this.api.post<Servicio>(`${CatalogoService.SERVICIOS}/${id}/activate`, {});
  }

  repuestosDe(idServicio: number): Observable<RepuestoDeServicioRespuesta[]> {
    return this.api.get<RepuestoDeServicioRespuesta[]>(
      `${CatalogoService.SERVICIOS}/${idServicio}/parts`,
    );
  }

  asociarRepuestos(
    idServicio: number,
    repuestos: RepuestoDeServicio[],
  ): Observable<RepuestoDeServicioRespuesta[]> {
    return this.api.put<RepuestoDeServicioRespuesta[]>(
      `${CatalogoService.SERVICIOS}/${idServicio}/parts`,
      repuestos,
    );
  }

  // ---------------------------------------------------------------- repuestos

  listarRepuestos(pagina = 0, tamano = 20): Observable<Pagina<Repuesto>> {
    const params = new HttpParams().set('page', pagina).set('size', tamano);
    return this.api.get<Pagina<Repuesto>>(CatalogoService.REPUESTOS, params);
  }

  /** Los que estan en o bajo su minimo, ordenados por stock ascendente. */
  repuestosBajoMinimo(): Observable<Repuesto[]> {
    return this.api.get<Repuesto[]>(`${CatalogoService.REPUESTOS}/low-stock`);
  }

  crearRepuesto(solicitud: RepuestoSolicitud): Observable<Repuesto> {
    return this.api.post<Repuesto>(CatalogoService.REPUESTOS, solicitud);
  }

  actualizarRepuesto(id: number, solicitud: RepuestoSolicitud): Observable<Repuesto> {
    return this.api.put<Repuesto>(`${CatalogoService.REPUESTOS}/${id}`, solicitud);
  }

  desactivarRepuesto(id: number): Observable<void> {
    return this.api.delete<void>(`${CatalogoService.REPUESTOS}/${id}`);
  }
}
