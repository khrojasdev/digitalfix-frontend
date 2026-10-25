import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const CLAVE = 'df.tema';

/**
 * Modo claro u oscuro de la aplicacion.
 *
 * Solo pone o quita la clase .tema-oscuro en <html>: el tema de Material y los
 * tokens propios usan light-dark(), asi que con cambiar color-scheme basta.
 * La eleccion se recuerda en el navegador; si no hay una guardada, se respeta
 * la preferencia del sistema operativo.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  private readonly enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly oscuro = signal(false);

  constructor() {
    if (!this.enNavegador) {
      return;
    }
    const guardado = leer();
    const prefiereOscuro =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.aplicar(guardado === null ? prefiereOscuro : guardado === 'oscuro');
  }

  alternar(): void {
    const siguiente = !this.oscuro();
    this.aplicar(siguiente);
    guardar(siguiente ? 'oscuro' : 'claro');
  }

  private aplicar(oscuro: boolean): void {
    this.oscuro.set(oscuro);
    this.documento.documentElement.classList.toggle('tema-oscuro', oscuro);
  }
}

// localStorage puede no estar disponible (modo privado, bloqueado): en ese caso
// el tema funciona igual, solo que no se recuerda.
function leer(): string | null {
  try {
    return window.localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

function guardar(valor: string): void {
  try {
    window.localStorage.setItem(CLAVE, valor);
  } catch {
    /* sin almacenamiento: no se recuerda */
  }
}
