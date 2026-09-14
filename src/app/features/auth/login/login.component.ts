import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card'; // Faltaba esto
import { MatIconModule } from '@angular/material/icon'; // Faltaba esto
import { MsalService } from '@azure/msal-angular';
import { RedirectRequest } from '@azure/msal-browser';
import { Router } from '@angular/router';
import { MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage, EventType } from '@azure/msal-browser';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './login.component.html',
  styles: [
    `
      .login-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      }
      .login-card {
        max-width: 400px;
        width: 100%;
        padding: 24px;
        text-align: center;
        border-radius: 12px;
        box-shadow:
          0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
      .brand-icon {
        font-size: 48px;
        height: 48px;
        width: 48px;
        color: #1e3a8a;
        margin-bottom: 16px;
      }
      .login-button {
        width: 100%;
        margin-bottom: 12px;
        padding: 8px 0;
      }
      .signup-button {
        width: 100%;
        padding: 8px 0;
      }
      p {
        color: #6b7280;
        margin-top: 16px;
        line-height: 1.5;
      }
    `,
  ],
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
