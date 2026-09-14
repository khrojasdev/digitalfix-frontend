import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
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
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
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
  // TECNICO no existe, y estaba en tres de los cuatro enlaces del menú.
  readonly puedeVerPanel$ = this.authContext.tieneAlguno$(['ADMIN', 'SUPERVISOR', 'AUDITOR']);
  readonly puedeVerCatalogo$ = this.authContext.tieneAlguno$([
    'ADMIN',
    'SUPERVISOR',
    'AUDITOR',
    'CLIENTE',
  ]);
  readonly puedeAuditar$ = this.authContext.tieneAlguno$(['ADMIN', 'AUDITOR']);

  cerrarSesion() {
    this.msalService.logoutRedirect();
  }
}
