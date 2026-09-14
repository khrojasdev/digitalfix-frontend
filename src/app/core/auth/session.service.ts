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

  public hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user ? user.roles.includes(role) : false;
  }

  public hasAnyRole(roles: string[]): boolean {
    const user = this.currentUserSubject.value;
    return user ? roles.some((r) => user.roles.includes(r)) : false;
  }
}
