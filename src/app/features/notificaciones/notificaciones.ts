import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { ESTADOS, NOMBRE_TIPO_EVENTO } from '../workorders/ordenes.service';
import { NotificacionesService } from './notificaciones.service';
import { Aviso, AvisoStock } from './notificaciones.models';

/**
 * Vista de notificaciones.
 *
 * Muestra lo que notify genera al consumir la mensajeria: avisos de cambio de
 * estado de las ordenes (exchange topic) y avisos de stock bajo minimo
 * (exchange direct). Las dos listas se piden por separado: si una falla,
 * la otra se muestra igual.
 */
@Component({
  selector: 'app-notificaciones',
  imports: [
    DatePipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
  /** Motivo por el que no se pudieron leer las alertas de stock (solo afecta esa tarjeta). */
  protected readonly errorStock = signal<string | null>(null);

  protected readonly avisos = signal<Aviso[]>([]);
  protected readonly avisosStock = signal<AvisoStock[]>([]);

  protected readonly tipos = ESTADOS;
  protected readonly nombreTipo: Record<string, string | undefined> = NOMBRE_TIPO_EVENTO;

  /** Filtros sobre lo que devolvio notify (las listas llegan completas). */
  protected readonly texto = signal('');
  protected readonly tipo = signal('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly filtrando = computed(() => !!(this.texto() || this.tipo() || this.desde() || this.hasta()));

  protected readonly avisosVisibles = computed(() =>
    this.avisos()
      .filter((a) => !this.tipo() || a.tipoEvento === this.tipo())
      .filter((a) => this.enRango(a.fechaAviso))
      .filter((a) => this.coincide(`#${a.ordenId} ${a.mensaje} ${a.tipoEvento}`))
      .sort((x, y) => (y.fechaAviso ?? '').localeCompare(x.fechaAviso ?? '')),
  );
  protected readonly stockVisibles = computed(() =>
    this.avisosStock()
      .filter((a) => this.enRango(a.fechaAviso))
      .filter((a) => this.coincide(`${a.sku} ${a.mensaje}`))
      .sort((x, y) => (y.fechaAviso ?? '').localeCompare(x.fechaAviso ?? '')),
  );

  protected readonly hayAvisos = computed(() => this.avisosVisibles().length > 0);
  protected readonly hayStock = computed(() => this.stockVisibles().length > 0);

  protected readonly columnasAvisos = ['ordenId', 'tipoEvento', 'mensaje', 'fechaAviso'];
  protected readonly columnasStock = ['sku', 'mensaje', 'fechaAviso'];

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.errorStock.set(null);

    // Antes iban en un forkJoin: si /api/avisos/stock fallaba (por ejemplo, un
    // notify desplegado sin el consumidor de stock responde 404), se perdian
    // tambien los avisos de ordenes, que si habian llegado.
    this.notificaciones.listarAvisos().subscribe({
      next: (avisos) => {
        this.avisos.set(avisos ?? []);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(this.mensaje(e));
        this.cargando.set(false);
      },
    });

    this.notificaciones.listarAvisosStock().subscribe({
      next: (stock) => this.avisosStock.set(stock ?? []),
      error: (e: unknown) => {
        this.avisosStock.set([]);
        this.errorStock.set(this.mensajeStock(e));
      },
    });
  }

  protected limpiar(): void {
    this.texto.set('');
    this.tipo.set('');
    this.desde.set('');
    this.hasta.set('');
  }

  private enRango(fecha: string | null | undefined): boolean {
    const dia = (fecha ?? '').slice(0, 10);
    if (this.desde() && dia < this.desde()) return false;
    if (this.hasta() && dia > this.hasta()) return false;
    return true;
  }

  private coincide(donde: string): boolean {
    const buscado = sinTildes(this.texto());
    return !buscado || sinTildes(donde).includes(buscado);
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

  private mensajeStock(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return 'Las alertas de stock no están disponibles: el servicio de notificaciones desplegado no tiene esa función.';
    }
    if (error instanceof HttpErrorResponse && error.status === 503) {
      return 'Las alertas de stock no están disponibles en este momento.';
    }
    return 'No se pudieron cargar las alertas de stock.';
  }
}

function sinTildes(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
