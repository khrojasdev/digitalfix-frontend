import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="access-denied-container">
      <mat-icon color="warn" class="error-icon">gpp_bad</mat-icon>
      <h1>Acceso Denegado</h1>
      <p>No tienes los permisos necesarios para ver esta sección.</p>
      <button mat-flat-button color="primary" routerLink="/catalog">Volver al inicio</button>
    </div>
  `,
  styles: [
    `
      .access-denied-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 60vh;
        text-align: center;
      }
      .error-icon {
        font-size: 80px;
        height: 80px;
        width: 80px;
        margin-bottom: 24px;
      }
      h1 {
        font-size: 32px;
        margin-bottom: 16px;
        color: #1f2937;
      }
      p {
        font-size: 18px;
        margin-bottom: 32px;
        color: #4b5563;
      }
    `,
  ],
})
export class AccessDeniedComponent {}
