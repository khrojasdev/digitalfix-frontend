import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/**
 * Pantalla de una funcionalidad que todavia no existe.
 *
 * La alternativa era no enrutarla y dejar el enlace apagado, pero entonces no
 * se puede mostrar la forma completa de la aplicacion ni revisar la navegacion
 * de punta a punta. Esto la deja recorrible y, sobre todo, honesta: dice que
 * falta, que hara cuando este y a que historia pertenece, en vez de fingir una
 * pantalla vacia que parece rota.
 */
@Component({
  selector: 'app-en-construccion',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './en-construccion.html',
  styleUrl: './en-construccion.scss',
})
export class EnConstruccion {
  /** Nombre de la pantalla, tal como aparece en el menu. */
  @Input({ required: true }) titulo = '';

  /** Icono de Material, el mismo que usa su entrada del menu. */
  @Input({ required: true }) icono = '';

  /** Una linea sobre para que sirve esta pantalla. */
  @Input({ required: true }) proposito = '';

  /** Lo concreto que se podra hacer aqui. */
  @Input() capacidades: string[] = [];

  /** Historias o tareas del backlog que la cubren. */
  @Input() historias = '';

  /** De que microservicio depende para poder existir. */
  @Input() dependeDe = '';
}
