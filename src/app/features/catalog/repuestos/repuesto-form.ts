import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { CatalogoService } from '../catalogo.service';
import { Repuesto } from '../catalogo.models';
import { mensajeDeError } from '../mensaje-error';

/** Alta y edicion de un repuesto, con su stock y su stock minimo. */
@Component({
  selector: 'app-repuesto-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './repuesto-form.html',
  styleUrl: './repuesto-form.scss',
})
export class RepuestoForm {
  private fb = inject(FormBuilder);
  private catalogo = inject(CatalogoService);

  readonly repuesto = input<Repuesto | null>(null);

  readonly guardado = output<Repuesto>();
  readonly cancelado = output<void>();

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.maxLength(40)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    stockMinimo: [0, [Validators.required, Validators.min(0)]],
    costoUnitario: [0, [Validators.min(0)]],
  });

  constructor() {
    effect(() => {
      const r = this.repuesto();
      this.error.set(null);
      if (r) {
        this.formulario.setValue({
          sku: r.sku,
          nombre: r.nombre,
          stock: r.stock,
          stockMinimo: r.stockMinimo,
          costoUnitario: r.costoUnitario ?? 0,
        });
      } else {
        this.formulario.reset({ sku: '', nombre: '', stock: 0, stockMinimo: 0, costoUnitario: 0 });
      }
    });
  }

  protected get editando(): boolean {
    return this.repuesto() !== null;
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const v = this.formulario.getRawValue();
    const solicitud = {
      sku: v.sku.trim(),
      nombre: v.nombre.trim(),
      stock: Number(v.stock),
      stockMinimo: Number(v.stockMinimo),
      costoUnitario: v.costoUnitario === null ? null : Number(v.costoUnitario),
    };

    this.guardando.set(true);
    this.error.set(null);

    const actual = this.repuesto();
    const peticion = actual
      ? this.catalogo.actualizarRepuesto(actual.id, solicitud)
      : this.catalogo.crearRepuesto(solicitud);

    peticion.subscribe({
      next: (guardado) => {
        this.guardando.set(false);
        this.guardado.emit(guardado);
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e, 'guardar el repuesto'));
      },
    });
  }

  protected cancelar(): void {
    this.cancelado.emit();
  }
}
