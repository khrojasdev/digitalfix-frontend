import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MsalService } from '@azure/msal-angular';
import { RedirectRequest } from '@azure/msal-browser';
import { Router } from '@angular/router';
import { MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage, EventType } from '@azure/msal-browser';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private msalService = inject(MsalService);

  iniciarSesion() {
    this.msalService.loginRedirect();
  }

  crearCuenta() {
    const signUpRequest: RedirectRequest = {
      scopes: ['user.read'],
      prompt: 'create',
    };
    this.msalService.loginRedirect(signUpRequest);
  }
}
