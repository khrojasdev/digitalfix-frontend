import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { Orden, OrdenesService, mensajeOrdenes } from './ordenes.service';
import { Tecnico, TecnicosService, mensajeTecnicos } from './tecnicos/tecnicos.service';

export interface DatosAsignacion {
  orden: Orden;
  /** Nombre del servicio, para mostrarlo en el encabezado. */
  servicio: string;
}

/**
 * El supervisor elige un tecnico activo para la orden. Al confirmar, la orden
 * queda ASIGNADA, catalog descuenta los repuestos y notify envia el ticket de
 * despacho al tecnico.
 */
@Component({
  selector: 'app-asignar-tecnico',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ reasignando ? 'Reasignar' : 'Asignar' }} técnico · orden #{{ datos.orden.id }}</h2>
    <mat-dialog-content>
      <p class="texto-suave ayuda">
        {{ datos.servicio }}.
        @if (reasignando) {
          Hoy la atiende <b>{{ datos.orden.asignadoA }}</b>; el nuevo técnico recibe el ticket de despacho.
        } @else {
          La orden pasa a <b>Asignada</b>, se descuentan los repuestos del servicio y el técnico recibe el ticket de despacho.
        }
      </p>

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando técnicos"></mat-progress-bar>
      } @else if (errorLista()) {
        <div class="mensaje mensaje--error" role="alert">{{ errorLista() }}</div>
      } @else if (opciones().length === 0) {
        <div class="mensaje mensaje--error">
          No hay técnicos activos{{ reasignando ? ' además del actual' : '' }}.
          <a routerLink="/workorders/tecnicos" mat-dialog-close>Agrega uno en Técnicos</a>.
        </div>
      } @else {
        <mat-form-field appearance="outline" class="campo">
          <mat-label>Técnico</mat-label>
          <mat-select [formControl]="tecnico" required>
            @for (t of opciones(); track t.id) {
              <mat-option [value]="t.id">{{ t.nombre }}{{ t.especialidad ? ' · ' + t.especialidad : '' }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="campo">
          <mat-label>Comentario para el técnico (opcional)</mat-label>
          <textarea matInput [formControl]="comentario" rows="3" maxlength="500"
                    placeholder="Prioridad, acceso al lugar, materiales…"></textarea>
          <mat-hint align="end">{{ comentario.value.length }}/500</mat-hint>
        </mat-form-field>
      }

      @if (error()) {
        <div class="mensaje mensaje--error" role="alert">{{ error() }}</div>
      }
    </mat-dialog-content>

    @if (guardando()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close [disabled]="guardando()">Cancelar</button>
      <button mat-flat-button type="button" (click)="asignar()" [disabled]="guardando() || tecnico.invalid || comentario.invalid">
        <mat-icon>engineering</mat-icon>
        {{ reasignando ? 'Reasignar' : 'Asignar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.campo { width: 100%; } .ayuda { margin: 0 0 16px; } mat-dialog-content { min-width: min(460px, 80vw); }`],
})
export class AsignarTecnicoDialog implements OnInit {
  protected readonly datos = inject<DatosAsignacion>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<AsignarTecnicoDialog, Orden>);
  private readonly ordenes = inject(OrdenesService);
  private readonly tecnicos = inject(TecnicosService);

  protected readonly reasignando = this.datos.orden.estado === 'ASIGNADA';
  protected readonly tecnico = new FormControl<number | null>(null, Validators.required);
  protected readonly comentario = new FormControl<string>('', { nonNullable: true, validators: Validators.maxLength(500) });

  protected readonly lista = signal<Tecnico[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorLista = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Activos, sin el que ya la tiene. */
  protected readonly opciones = computed(() =>
    this.lista().filter((t) => t.activo && t.id !== this.datos.orden.tecnicoId),
  );

  ngOnInit(): void {
    this.tecnicos.listar(true).subscribe({
      next: (lista) => {
        this.lista.set(lista ?? []);
        this.cargando.set(false);
        const unico = this.opciones();
        if (unico.length === 1) this.tecnico.setValue(unico[0].id);
      },
      error: (e: unknown) => {
        this.errorLista.set(mensajeTecnicos(e, 'cargar los técnicos'));
        this.cargando.set(false);
      },
    });
  }

  protected asignar(): void {
    const id = this.tecnico.value;
    if (id == null) return;
    this.guardando.set(true);
    this.error.set(null);
    this.ordenes.asignarTecnico(this.datos.orden.id, id, this.comentario.value).subscribe({
      next: (orden) => this.ref.close(orden),
      error: (e: unknown) => {
        this.error.set(mensajeOrdenes(e, 'asignar el técnico'));
        this.guardando.set(false);
      },
    });
  }
}
