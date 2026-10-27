import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { EstadoOrden, NOMBRE_ESTADO } from './ordenes.service';

export interface DatosCambioEstado {
  ordenId: number;
  destino: EstadoOrden;
  /** Texto del boton de confirmar; por defecto "Pasar a <estado>". */
  accion?: string;
}

/** Lo que devuelve el dialogo al confirmar. */
export interface CambioConfirmado {
  comentario: string | null;
}

/**
 * Confirma un cambio de estado y deja escribir un comentario opcional, que
 * queda en el historial de la orden y le llega al cliente en el aviso.
 */
@Component({
  selector: 'app-cambio-estado',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Orden #{{ datos.ordenId }}: {{ nombreDestino }}</h2>
    <mat-dialog-content>
      <p class="texto-suave ayuda">Puedes dejar un comentario: queda en el historial de la orden y el cliente lo ve en su aviso.</p>
      <mat-form-field appearance="outline" class="campo">
        <mat-label>Comentario (opcional)</mat-label>
        <textarea matInput [formControl]="comentario" rows="4" maxlength="500"
                  placeholder="Qué se hizo, qué falta, a qué hora se llega…"></textarea>
        <mat-hint align="end">{{ comentario.value.length }}/500</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="button" (click)="confirmar()" [disabled]="comentario.invalid">
        <mat-icon>check</mat-icon>
        {{ datos.accion || 'Pasar a ' + nombreDestino }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.campo { width: 100%; } .ayuda { margin: 0 0 12px; } mat-dialog-content { min-width: min(460px, 80vw); }`],
})
export class CambioEstadoDialog {
  protected readonly datos = inject<DatosCambioEstado>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<CambioEstadoDialog, CambioConfirmado>);

  protected readonly nombreDestino = NOMBRE_ESTADO[this.datos.destino] ?? this.datos.destino;
  protected readonly comentario = new FormControl<string>('', { nonNullable: true, validators: Validators.maxLength(500) });

  protected confirmar(): void {
    if (this.comentario.invalid) return;
    const texto = this.comentario.value.trim();
    this.ref.close({ comentario: texto || null });
  }
}
