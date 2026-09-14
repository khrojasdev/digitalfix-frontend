import { Injectable, inject } from '@angular/core';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { BehaviorSubject, filter } from 'rxjs';

export interface UserProfile {
  name: string;
  email: string;
  roles: string[];
  scopes: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private msalService = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.msalBroadcastService.inProgress$
      .pipe(filter((status: InteractionStatus) => status === InteractionStatus.None))
      .subscribe(() => {
        const account = this.msalService.instance.getActiveAccount();
        if (account) {
          // Entra ID suele enviar los scopes como un string separado por espacios en el claim 'scp'
          const scpClaim = account.idTokenClaims?.['scp'];
          const parsedScopes = typeof scpClaim === 'string' ? scpClaim.split(' ') : [];

          this.currentUserSubject.next({
            name: account.name || '',
            email: account.username || '',
            roles: (account.idTokenClaims?.['roles'] as string[]) || [],
            scopes: parsedScopes,
          });
        } else {
          this.currentUserSubject.next(null);
        }
      });
  }

  /**
   * Los roles que trae el token, que puede ser ninguno: Entra solo incluye el
   * claim `roles` si hay app roles asignados en el registro de la aplicacion.
   * La fuente de verdad de los roles es APP_USER, y llega por /api/me; esto
   * es solo el respaldo. Ver AuthContextService.roles$.
   */
  public rolesDelToken(): string[] {
    return this.currentUserSubject.value?.roles ?? [];
  }

  public hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user ? user.roles.includes(role) : false;
  }

  public hasAnyRole(roles: string[]): boolean {
    const user = this.currentUserSubject.value;
    return user ? roles.some((r) => user.roles.includes(r)) : false;
  }
}
