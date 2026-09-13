import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { SessionService } from './core/auth/session.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private msalService = inject(MsalService);
  private sessionService = inject(SessionService); // Instancia el servicio en el arranque

  ngOnInit(): void {
    this.msalService.handleRedirectObservable().subscribe({
      next: (result) => {
        if (result !== null && result.account !== null) {
          this.msalService.instance.setActiveAccount(result.account);
        }
      },
      error: (error) => console.error('Error en redirect:', error),
    });
  }
}
