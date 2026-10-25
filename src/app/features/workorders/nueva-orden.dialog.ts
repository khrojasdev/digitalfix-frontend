import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import { Servicio } from '../catalog/catalogo.models';
import { Orden, OrdenesService, mensajeOrdenes } from './ordenes.service';

export interface DatosNuevaOrden {
  /** Servicios activos del catalogo, para elegir cual se solicita. */
  servicios: Servicio[];
  /** Si el catalogo no se pudo leer, el motivo; se muestra en vez de "no hay servicios". */
  errorCatalogo?: string | null;
}

/**
 * Formulario para crear una orden de trabajo: el servicio del catalogo que se
 * solicita y un comentario opcional. La empresa y el autor los pone el BFF a
 * partir del token, no se envian desde aqui.
 */
@Component({
  selector: 'app-nueva-orden',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Nueva orden de trabajo</h2>
    <form [formGroup]="formulario" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <p class="texto-suave ayuda">Elige el servicio que se va a realizar. La orden queda en estado <b>Creada</b>.</p>

        @if (datos.errorCatalogo) {
          <div class="mensaje mensaje--error">{{ datos.errorCatalogo }}</div>
        } @else if (datos.servicios.length === 0) {
          <div class="mensaje mensaje--error">No hay servicios activos en el catálogo. Activa o crea uno primero.</div>
        }

        <mat-form-field appearance="outline" class="campo">
          <mat-label>Servicio</mat-label>
          <mat-select formControlName="servicioId" required>
            @for (s of datos.servicios; track s.id) {
              <mat-option [value]="s.id">{{ s.codigo }} · {{ s.nombre }}</mat-option>
            }
          </mat-select>
          @if (formulario.controls.servicioId.hasError('required')) {
            <mat-error>Elige un servicio.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="campo">
          <mat-label>Comentarios</mat-label>
          <textarea matInput formControlName="comentarios" rows="4" maxlength="500"
                    placeholder="Dirección, equipo afectado, horario de acceso…"></textarea>
          <mat-hint align="end">{{ formulario.controls.comentarios.value?.length ?? 0 }}/500</mat-hint>
        </mat-form-field>

        @if (error()) {
          <div class="mensaje mensaje--error" role="alert">{{ error() }}</div>
        }
      </mat-dialog-content>

      @if (guardando()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close [disabled]="guardando()">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="guardando() || formulario.invalid">
          <mat-icon>add_task</mat-icon>
          Crear orden
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`.campo { width: 100%; } .ayuda { margin: 0 0 16px; } mat-dialog-content { min-width: min(480px, 80vw); }`],
})
export class NuevaOrdenDialog {
  protected readonly datos = inject<DatosNuevaOrden>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<NuevaOrdenDialog, Orden>);
  private readonly ordenes = inject(OrdenesService);

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = new FormGroup({
    servicioId: new FormControl<number | null>(null, Validators.required),
    comentarios: new FormControl<string>('', Validators.maxLength(500)),
  });

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { servicioId, comentarios } = this.formulario.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    this.ordenes
      .crear({ servicioId: servicioId!, comentarios: comentarios?.trim() || null })
      .subscribe({
        next: (orden) => this.ref.close(orden),
        error: (e: unknown) => {
          this.error.set(mensajeOrdenes(e, 'crear la orden'));
          this.guardando.set(false);
        },
      });
  }
}
