import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { SessionService } from '../../../core/auth/session.service';
import { AuthContextService } from '../../../core/auth/auth-context.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent {
  private breakpointObserver = inject(BreakpointObserver);
  private msalService = inject(MsalService);

  public sessionService = inject(SessionService);
  public authContext = inject(AuthContextService);

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map((result) => result.matches),
    shareReplay(),
  );

  // Los cuatro roles del caso son ADMIN, SUPERVISOR, CLIENTE y AUDITOR.
  // Los roles salen de /api/me, no del token: ver AuthContextService.
  readonly puedeVerPanel$ = this.authContext.tieneAlguno$(['ADMIN', 'SUPERVISOR', 'AUDITOR']);
  readonly puedeVerCatalogo$ = this.authContext.tieneAlguno$([
    'ADMIN',
    'SUPERVISOR',
    'AUDITOR',
    'CLIENTE',
  ]);
  readonly puedeVerRepuestos$ = this.authContext.tieneAlguno$(['ADMIN', 'SUPERVISOR', 'AUDITOR']);
  readonly puedeVerOrdenes$ = this.authContext.tieneAlguno$([
    'ADMIN',
    'SUPERVISOR',
    'AUDITOR',
    'CLIENTE',
  ]);
  readonly puedeVerReportes$ = this.authContext.tieneAlguno$(['ADMIN', 'SUPERVISOR']);
  readonly puedeAuditar$ = this.authContext.tieneAlguno$(['ADMIN', 'AUDITOR']);

  /** Las iniciales del avatar. Dos letras como mucho: tres ya no se leen. */
  iniciales(nombre: string | null | undefined): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) {
      return '·';
    }
    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  cerrarSesion() {
    this.msalService.logoutRedirect();
  }
}
