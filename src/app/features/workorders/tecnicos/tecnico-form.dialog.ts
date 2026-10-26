import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Tecnico, TecnicosService, mensajeTecnicos } from './tecnicos.service';

export interface DatosTecnicoDialog {
  /** El tecnico a editar; null para crear uno nuevo. */
  tecnico: Tecnico | null;
}

/** Alta y edicion de un tecnico de terreno. */
@Component({
  selector: 'app-tecnico-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ datos.tecnico ? 'Editar técnico' : 'Nuevo técnico' }}</h2>
    <form [formGroup]="formulario" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <p class="texto-suave ayuda">El correo es donde le llega el ticket de despacho cuando se le asigna una orden.</p>

        <mat-form-field appearance="outline" class="campo">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" maxlength="120" required />
          @if (formulario.controls.nombre.hasError('required')) {
            <mat-error>Escribe el nombre.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="campo">
          <mat-label>Correo</mat-label>
          <input matInput type="email" formControlName="email" maxlength="150" required />
          @if (formulario.controls.email.hasError('required')) {
            <mat-error>Escribe el correo.</mat-error>
          } @else if (formulario.controls.email.hasError('email')) {
            <mat-error>El correo no es válido.</mat-error>
          }
        </mat-form-field>

        <div class="fila">
          <mat-form-field appearance="outline" class="campo">
            <mat-label>Teléfono</mat-label>
            <input matInput formControlName="telefono" maxlength="30" placeholder="+56 9 …" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="campo">
            <mat-label>Especialidad</mat-label>
            <input matInput formControlName="especialidad" maxlength="100" placeholder="Tableros, termografía…" />
          </mat-form-field>
        </div>

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
          <mat-icon>save</mat-icon>
          Guardar
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `.campo { width: 100%; } .ayuda { margin: 0 0 16px; } .fila { display: flex; gap: 12px; flex-wrap: wrap; }
     .fila .campo { flex: 1 1 180px; } mat-dialog-content { min-width: min(480px, 80vw); }`,
  ],
})
export class TecnicoFormDialog {
  protected readonly datos = inject<DatosTecnicoDialog>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TecnicoFormDialog, Tecnico>);
  private readonly tecnicos = inject(TecnicosService);

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = new FormGroup({
    nombre: new FormControl(this.datos.tecnico?.nombre ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    email: new FormControl(this.datos.tecnico?.email ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(150)],
    }),
    telefono: new FormControl(this.datos.tecnico?.telefono ?? '', { nonNullable: true, validators: Validators.maxLength(30) }),
    especialidad: new FormControl(this.datos.tecnico?.especialidad ?? '', {
      nonNullable: true,
      validators: Validators.maxLength(100),
    }),
  });

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const v = this.formulario.getRawValue();
    const datos = {
      nombre: v.nombre.trim(),
      email: v.email.trim(),
      telefono: v.telefono.trim() || null,
      especialidad: v.especialidad.trim() || null,
    };
    const actual = this.datos.tecnico;
    const pedido = actual ? this.tecnicos.actualizar(actual.id, datos) : this.tecnicos.crear(datos);
    this.guardando.set(true);
    this.error.set(null);
    pedido.subscribe({
      next: (tecnico) => this.ref.close(tecnico),
      error: (e: unknown) => {
        this.error.set(mensajeTecnicos(e, 'guardar el técnico'));
        this.guardando.set(false);
      },
    });
  }
}
