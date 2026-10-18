import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { Orden, OrdenesService } from './ordenes.service';

/**
 * Vista de ordenes de trabajo. Lista las ordenes de la empresa desde el BFF.
 */
@Component({
  selector: 'app-workorders',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatIconModule, MatButtonModule, MatProgressBarModule],
  template: `
    <section class="pagina">
      <header class="encabezado-pagina">
        <div>
          <h1>Órdenes de trabajo</h1>
          <p class="subtitulo">Órdenes registradas para tu empresa y su estado.</p>
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

      <mat-card class="tarjeta">
        <mat-card-content>
          @if (hay()) {
            <div class="contenedor-tabla">
              <table mat-table [dataSource]="ordenes()">
                <ng-container matColumnDef="id">
                  <th mat-header-cell *matHeaderCellDef>Orden</th>
                  <td mat-cell *matCellDef="let o">#{{ o.id }}</td>
                </ng-container>
                <ng-container matColumnDef="servicioId">
                  <th mat-header-cell *matHeaderCellDef>Servicio</th>
                  <td mat-cell *matCellDef="let o">{{ o.servicioId }}</td>
                </ng-container>
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let o"><span class="etiqueta">{{ o.estado }}</span></td>
                </ng-container>
                <ng-container matColumnDef="asignadoA">
                  <th mat-header-cell *matHeaderCellDef>Asignada a</th>
                  <td mat-cell *matCellDef="let o">{{ o.asignadoA || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="fechaCreacion">
                  <th mat-header-cell *matHeaderCellDef>Creada</th>
                  <td mat-cell *matCellDef="let o">{{ o.fechaCreacion }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="columnas"></tr>
                <tr mat-row *matRowDef="let row; columns: columnas"></tr>
              </table>
            </div>
          } @else if (!cargando()) {
            <p class="mensaje">Todavía no hay órdenes registradas.</p>
          }
        </mat-card-content>
      </mat-card>
    </section>
  `,
})
export class Workorders implements OnInit {
  private service = inject(OrdenesService);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly ordenes = signal<Orden[]>([]);
  protected readonly hay = computed(() => this.ordenes().length > 0);
  protected readonly columnas = ['id', 'servicioId', 'estado', 'asignadoA', 'fechaCreacion'];

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service.listar().subscribe({
      next: (ordenes) => {
        this.ordenes.set(ordenes ?? []);
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
    if (error.status === 403) return 'Tu rol no permite ver las órdenes.';
    if (error.status === 503) return 'El servicio de órdenes no está disponible en este momento.';
  }
  return 'No se pudieron cargar las órdenes.';
}
