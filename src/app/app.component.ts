import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router'; // <-- 1. Importa Router
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage, EventType, AuthenticationResult } from '@azure/msal-browser';
import { filter } from 'rxjs/operators';

import { TemaService } from './core/ui/tema.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'digitalfix-frontend';

  // Se instancia en la raiz para que el tema guardado (o el del sistema) se
  // aplique en todas las pantallas, tambien en el inicio de sesion.
  private readonly tema = inject(TemaService);

  constructor(
    private msalService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private router: Router // <-- 2. Inyecta el Router aquí
  ) {}

ngOnInit(): void {
    // 1. Verificación directa: Si el config ya procesó el login y hay sesión, saltamos.
    if (this.msalService.instance.getActiveAccount() != null) {
      this.router.navigate(['/catalog']);
    }

    // 2. Escucha reactiva (por si ocurre después)
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS)
      )
      .subscribe((msg: EventMessage) => {
        const result = msg.payload as AuthenticationResult;
        this.msalService.instance.setActiveAccount(result.account);
        this.router.navigate(['/catalog']);
      });
  }
}