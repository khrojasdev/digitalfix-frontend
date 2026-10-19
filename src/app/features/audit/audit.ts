import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { AuditoriaService, EventoAuditoria } from './auditoria.service';

/**
 * Vista de auditoría: los eventos que registra ms-digitalfix-audit al consumir
 * la mensajería, a través del BFF.
 */
@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatIconModule, MatButtonModule, MatProgressBarModule],
  template: `
    <section class="pagina">
      <header class="encabezado-pagina">
        <div>
          <h1>Auditoría</h1>
          <p class="subtitulo">Eventos registrados para tu empresa.</p>
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
              <table mat-table [dataSource]="eventos()">
                <ng-container matColumnDef="fecha">
                  <th mat-header-cell *matHeaderCellDef>Fecha</th>
                  <td mat-cell *matCellDef="let e">{{ e.fecha }}</td>
                </ng-container>
                <ng-container matColumnDef="tipoEvento">
                  <th mat-header-cell *matHeaderCellDef>Evento</th>
                  <td mat-cell *matCellDef="let e"><span class="etiqueta">{{ e.tipoEvento }}</span></td>
                </ng-container>
                <ng-container matColumnDef="ordenId">
                  <th mat-header-cell *matHeaderCellDef>Orden</th>
                  <td mat-cell *matCellDef="let e">{{ e.ordenId ? '#' + e.ordenId : '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="autorId">
                  <th mat-header-cell *matHeaderCellDef>Autor</th>
                  <td mat-cell *matCellDef="let e">{{ e.autorId || '—' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="columnas"></tr>
                <tr mat-row *matRowDef="let row; columns: columnas"></tr>
              </table>
            </div>
          } @else if (!cargando()) {
            <p class="mensaje">Todavía no hay eventos de auditoría.</p>
          }
        </mat-card-content>
      </mat-card>
    </section>
  `,
})
export class Audit implements OnInit {
  private service = inject(AuditoriaService);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly eventos = signal<EventoAuditoria[]>([]);
  protected readonly hay = computed(() => this.eventos().length > 0);
  protected readonly columnas = ['fecha', 'tipoEvento', 'ordenId', 'autorId'];

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service.eventos().subscribe({
      next: (pagina) => {
        this.eventos.set(pagina?.content ?? []);
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
    if (error.status === 403) return 'La auditoría está disponible solo para el rol ADMIN.';
    if (error.status === 503) return 'El servicio de auditoría no está disponible en este momento.';
  }
  return 'No se pudieron cargar los eventos de auditoría.';
}
