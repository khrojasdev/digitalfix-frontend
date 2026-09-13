import { Component, effect, inject, input, output, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { CatalogoService } from '../catalogo.service';
import { Servicio } from '../catalogo.models';
import { mensajeDeError } from '../mensaje-error';

/**
 * Alta y edicion de un servicio.
 *
 * Las validaciones repiten las del backend a proposito: aqui son para que la
 * persona no pierda el tiempo, y alla son la garantia. Si alguna vez difieren,
 * manda la del backend.
 */
@Component({
  selector: 'app-servicio-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './servicio-form.html',
  styleUrl: './servicio-form.scss',
})
export class ServicioForm {
  private fb = inject(FormBuilder);
  private catalogo = inject(CatalogoService);

  /** null = alta; con valor = edicion. */
  readonly servicio = input<Servicio | null>(null);

  readonly guardado = output<Servicio>();
  readonly cancelado = output<void>();

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: ['', [Validators.maxLength(500)]],
    tarifa: [0, [Validators.required, Validators.min(0.01)]],
  });

  constructor() {
    effect(() => {
      const s = this.servicio();
      this.error.set(null);
      if (s) {
        this.formulario.setValue({
          codigo: s.codigo,
          nombre: s.nombre,
          descripcion: s.descripcion ?? '',
          tarifa: s.tarifa,
        });
      } else {
        this.formulario.reset({ codigo: '', nombre: '', descripcion: '', tarifa: 0 });
      }
    });
  }

  protected get editando(): boolean {
    return this.servicio() !== null;
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const solicitud = {
      codigo: valores.codigo.trim(),
      nombre: valores.nombre.trim(),
      descripcion: valores.descripcion.trim() === '' ? null : valores.descripcion.trim(),
      tarifa: Number(valores.tarifa),
    };

    this.guardando.set(true);
    this.error.set(null);

    const actual = this.servicio();
    const peticion = actual
      ? this.catalogo.actualizarServicio(actual.id, solicitud)
      : this.catalogo.crearServicio(solicitud);

    peticion.subscribe({
      next: (guardado) => {
        this.guardando.set(false);
        this.guardado.emit(guardado);
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e, 'guardar el servicio'));
      },
    });
  }

  protected cancelar(): void {
    this.cancelado.emit();
  }
}
