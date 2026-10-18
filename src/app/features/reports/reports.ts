import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';

import { Indicadores, ReportesService, ServicioRanking } from './reportes.service';

/**
 * Vista de reportes: indicadores operacionales y ranking de servicios mas
 * solicitados, desde ms-digitalfix-report a traves del BFF.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [DecimalPipe, MatCardModule, MatTableModule, MatIconModule, MatButtonModule, MatProgressBarModule],
  template: `
    <section class="pagina">
      <header class="encabezado-pagina">
        <div>
          <h1>Reportes</h1>
          <p class="subtitulo">Indicadores de las últimas 24 horas.</p>
        </div>
        <button mat-stroked-button type="button" (click)="cargar()" [disabled]="cargando()">
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>
      </header>

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }
      @if (error()) {
        <div class="mensaje mensaje-error">{{ error() }}</div>
      }

      @if (indicadores(); as ind) {
        <div class="tarjetas-indicadores">
          <mat-card class="tarjeta">
            <mat-card-content>
              <span class="indicador-valor">{{ ind.ordenesTotales }}</span>
              <span class="indicador-nota">órdenes totales</span>
            </mat-card-content>
          </mat-card>
          <mat-card class="tarjeta">
            <mat-card-content>
              <span class="indicador-valor">
                {{ ind.tiempoMedioResolucionMinutos !== null ? (ind.tiempoMedioResolucionMinutos | number: '1.0-0') : '—' }}
              </span>
              <span class="indicador-nota">min. promedio de resolución</span>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <mat-card class="tarjeta">
        <mat-card-header><mat-card-title>Servicios más solicitados</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (hayRanking()) {
            <div class="contenedor-tabla">
              <table mat-table [dataSource]="ranking()">
                <ng-container matColumnDef="servicioId">
                  <th mat-header-cell *matHeaderCellDef>Servicio</th>
                  <td mat-cell *matCellDef="let r">{{ r.servicioId }}</td>
                </ng-container>
                <ng-container matColumnDef="cantidadSolicitudes">
                  <th mat-header-cell *matHeaderCellDef>Solicitudes</th>
                  <td mat-cell *matCellDef="let r">{{ r.cantidadSolicitudes }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="columnas"></tr>
                <tr mat-row *matRowDef="let row; columns: columnas"></tr>
              </table>
            </div>
          } @else if (!cargando()) {
            <p class="mensaje">Sin datos de ranking en el período.</p>
          }
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: [
    `.tarjetas-indicadores { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; }
     .tarjetas-indicadores .tarjeta { flex: 1 1 180px; }
     .indicador-valor { display: block; font-size: 2rem; font-weight: 600; }
     .indicador-nota { color: var(--df-suave, #5f6368); }
     table { width: 100%; }`,
  ],
})
export class Reports implements OnInit {
  private service = inject(ReportesService);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly indicadores = signal<Indicadores | null>(null);
  protected readonly ranking = signal<ServicioRanking[]>([]);
  protected readonly hayRanking = computed(() => this.ranking().length > 0);
  protected readonly columnas = ['servicioId', 'cantidadSolicitudes'];

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      indicadores: this.service.indicadores(),
      ranking: this.service.topServicios(),
    }).subscribe({
      next: ({ indicadores, ranking }) => {
        this.indicadores.set(indicadores);
        this.ranking.set(ranking ?? []);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensaje(e));
        this.cargando.set(false);
      },
    });
  }
}

function mensaje(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor.';
    if (error.status === 403) return 'Los reportes están disponibles solo para el rol ADMIN.';
    if (error.status === 503) return 'El servicio de reportes no está disponible en este momento.';
  }
  return 'No se pudieron cargar los reportes.';
}
