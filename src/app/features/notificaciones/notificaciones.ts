import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';

import { NotificacionesService } from './notificaciones.service';
import { Aviso, AvisoStock } from './notificaciones.models';

/**
 * Vista de notificaciones.
 *
 * Muestra lo que notify genera al consumir la mensajeria: avisos de cambio de
 * estado de las ordenes (exchange topic) y avisos de stock bajo minimo
 * (exchange direct). Las dos listas se piden a la vez con forkJoin.
 */
@Component({
  selector: 'app-notificaciones',
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTableModule,
  ],
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.scss',
})
export class Notificaciones implements OnInit {
  private notificaciones = inject(NotificacionesService);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly avisos = signal<Aviso[]>([]);
  protected readonly avisosStock = signal<AvisoStock[]>([]);

  protected readonly hayAvisos = computed(() => this.avisos().length > 0);
  protected readonly hayStock = computed(() => this.avisosStock().length > 0);

  protected readonly columnasAvisos = ['ordenId', 'tipoEvento', 'mensaje', 'fechaAviso'];
  protected readonly columnasStock = ['sku', 'mensaje', 'fechaAviso'];

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    forkJoin({
      avisos: this.notificaciones.listarAvisos(),
      stock: this.notificaciones.listarAvisosStock(),
    }).subscribe({
      next: ({ avisos, stock }) => {
        this.avisos.set(avisos ?? []);
        this.avisosStock.set(stock ?? []);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(this.mensaje(e));
        this.cargando.set(false);
      },
    });
  }

  private mensaje(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No hay conexion con el servidor.';
      }
      if (error.status === 403) {
        return 'Tu rol no permite ver las notificaciones.';
      }
      if (error.status === 503) {
        return 'El servicio de notificaciones no esta disponible en este momento.';
      }
    }
    return 'No se pudieron cargar las notificaciones.';
  }
}
