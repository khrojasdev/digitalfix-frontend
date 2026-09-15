import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * Marca cada petición con un identificador de correlación.
 *
 * Cuando el API Gateway esté delante, una llamada que falla deja rastro en
 * tres sitios distintos: el registro del gateway, el del BFF y el del
 * microservicio. Sin un identificador común hay que cruzarlos por hora, que es
 * justo lo que no funciona cuando hay carga. El BFF ya imprime esta cabecera
 * en su patrón de log; el gateway puede reenviarla sin configuración extra.
 *
 * Se aplica solo a la API: una cabecera propia en una petición a un tercero
 * dispararía una comprobación previa de CORS a cambio de nada.
 */
@Injectable()
export class CorrelacionInterceptor implements HttpInterceptor {
  static readonly CABECERA = 'X-Correlation-Id';

  intercept(peticion: HttpRequest<unknown>, siguiente: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!peticion.url.startsWith(environment.apiUrl)) {
      return siguiente.handle(peticion);
    }

    return siguiente.handle(
      peticion.clone({
        setHeaders: { [CorrelacionInterceptor.CABECERA]: nuevoIdentificador() },
      }),
    );
  }
}

/**
 * crypto.randomUUID no existe en contextos no seguros ni en el render del
 * servidor, así que hay un camino alternativo. El identificador solo tiene que
 * ser distinto del de al lado, no criptográficamente fuerte.
 */
function nuevoIdentificador(): string {
  const cripto = globalThis.crypto as Crypto | undefined;
  if (cripto?.randomUUID) {
    return cripto.randomUUID();
  }
  return `df-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
