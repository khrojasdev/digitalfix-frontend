import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { SessionService } from './session.service';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  oid: string;
  email: string;
  name: string;
  companyId: string;
  companyName: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthContextService {
  private http = inject(HttpClient);
  private sessionService = inject(SessionService);

  // Escucha el estado de la sesión y reacciona automáticamente
  public profile$: Observable<UserProfile | null> = this.sessionService.currentUser$.pipe(
    switchMap((session) => {
      // Si MSAL dice que no hay sesión, vaciamos el perfil
      if (!session) {
        return of(null);
      }
      // Si hay sesión, consultamos al BFF. La ruta es /api/me: sin el prefijo
      // no la atiende nadie.
      return this.http.get<UserProfile>(`${environment.apiUrl}/api/me`).pipe(
        // Que el perfil falle no puede dejar la cabecera sin nombre ni la
        // aplicación sin menú: se degrada a null y las pantallas siguen.
        catchError(() => of(null)),
      );
    }),
    // El 1 indica que guarde en caché la última respuesta y se la entregue a los nuevos suscriptores
    shareReplay(1),
  );

  /**
   * Los roles que mandan al decidir qué ve cada persona.
   *
   * Salen del perfil del BFF, que los lee de APP_USER. Esa es la fuente de
   * verdad del caso: un rol pertenece a una persona DENTRO de una empresa, y
   * eso vive en la base, no en el token — el tenant de identidad es uno solo
   * para las veinte empresas.
   *
   * Los del token quedan de respaldo para cuando el BFF no contesta. Antes
   * eran la única fuente, y como el token de Entra suele llegar sin el claim
   * `roles`, el menú lateral se renderizaba vacío: cada enlace preguntaba por
   * un rol que nunca estaba.
   */
  public roles$: Observable<string[]> = this.profile$.pipe(
    map((perfil) => {
      const delPerfil = (perfil?.roles ?? []).map((r) => r.toUpperCase());
      if (delPerfil.length > 0) {
        return delPerfil;
      }
      return this.sessionService.rolesDelToken().map((r) => r.toUpperCase());
    }),
    shareReplay(1),
  );

  /** true si la persona tiene al menos uno de esos roles. */
  public tieneAlguno$(roles: string[]): Observable<boolean> {
    const buscados = roles.map((r) => r.toUpperCase());
    return this.roles$.pipe(map((suyos) => suyos.some((r) => buscados.includes(r))));
  }
}
