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
  private sessionService = inject(SessionService);

  ngOnInit(): void {
    this.msalService.handleRedirectObservable().subscribe({
      next: (result) => {
        // 1. Si viene de un redirect de Microsoft, asigna la nueva cuenta
        if (result !== null && result.account !== null) {
          this.msalService.instance.setActiveAccount(result.account);
        } else {
          // 2. Si es un F5, busca la cuenta en localStorage (persistencia)
          const currentAccount = this.msalService.instance.getActiveAccount();
          if (!currentAccount) {
            const accounts = this.msalService.instance.getAllAccounts();
            if (accounts.length > 0) {
              this.msalService.instance.setActiveAccount(accounts[0]);
            }
          }
        }
      },
      error: (error) => console.error('Error en redirect:', error),
    });
  }
}
