import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MsalService } from '@azure/msal-angular';

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
}
