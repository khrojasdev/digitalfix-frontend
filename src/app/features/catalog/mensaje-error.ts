import { HttpErrorResponse } from '@angular/common/http';

import { RespuestaError } from './catalogo.models';

/**
 * Traduce un error HTTP al mensaje que ve la persona.
 *
 * El backend devuelve siempre el mismo cuerpo (RespuestaError), asi que se
 * aprovecha su texto cuando existe. Los codigos se traducen a lenguaje de
 * negocio: un 404 no dice "no encontrado", dice que el recurso no existe en
 * la empresa, porque eso es exactamente lo que significa con el filtro por
 * empresa activo.
 */
export function mensajeDeError(error: unknown, accion = 'completar la operacion'): string {
  if (!(error instanceof HttpErrorResponse)) {
    return `No se pudo ${accion}.`;
  }

  const cuerpo = error.error as RespuestaError | null;
  const detalle = cuerpo?.message?.trim();

  switch (error.status) {
    case 0:
      return 'No hay conexion con el servidor. Revisa que el BFF este levantado.';
    case 400:
      return detalle || 'Los datos enviados no son validos.';
    case 401:
      return 'Tu sesion no es valida o expiro. Vuelve a iniciar sesion.';
    case 403:
      return 'Tu rol no permite esta accion.';
    case 404:
      return 'El recurso no existe en tu empresa.';
    case 409:
      return detalle || 'Ya existe otro registro con ese identificador.';
    case 503:
      return 'El catalogo no esta disponible en este momento. Intenta de nuevo en unos segundos.';
    default:
      return detalle || `No se pudo ${accion}.`;
  }
}
