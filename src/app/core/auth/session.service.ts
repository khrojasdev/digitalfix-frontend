import { Injectable, inject } from '@angular/core';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { BehaviorSubject, filter } from 'rxjs';

export interface UserProfile {
  name: string;
  email: string;
  roles: string[];
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
          this.currentUserSubject.next({
            name: account.name || '',
            email: account.username || '',
            roles: (account.idTokenClaims?.['roles'] as string[]) || [],
          });
        } else {
          this.currentUserSubject.next(null);
        }
      });
  }
}
