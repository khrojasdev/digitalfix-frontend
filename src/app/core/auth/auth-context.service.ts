import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, switchMap } from 'rxjs/operators';
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
}
