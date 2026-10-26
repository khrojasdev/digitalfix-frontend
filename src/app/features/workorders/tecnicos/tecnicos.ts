import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { DatosTecnicoDialog, TecnicoFormDialog } from './tecnico-form.dialog';
import { Tecnico, TecnicosService, mensajeTecnicos } from './tecnicos.service';

/**
 * Tecnicos de terreno de la empresa: alta, edicion, baja y reactivacion.
 * Son los que el supervisor asigna a las ordenes de trabajo.
 */
@Component({
  selector: 'app-tecnicos',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
    RouterLink,
  ],
  templateUrl: './tecnicos.html',
})
export class Tecnicos implements OnInit {
  private readonly service = inject(TecnicosService);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  protected readonly columnas = ['nombre', 'contacto', 'especialidad', 'cuenta', 'estado', 'fechaCreacion', 'acciones'];

  protected readonly tecnicos = signal<Tecnico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly trabajando = signal<number | null>(null);
  protected readonly texto = signal('');
  protected readonly verInactivos = signal(false);

  protected readonly activos = computed(() => this.tecnicos().filter((t) => t.activo).length);

  protected readonly visibles = computed(() => {
    const buscado = normalizar(this.texto());
    return this.tecnicos()
      .filter((t) => this.verInactivos() || t.activo)
      .filter((t) =>
        !buscado ||
        [t.nombre, t.email, t.especialidad ?? '', t.telefono ?? ''].some((campo) => normalizar(campo).includes(buscado)),
      );
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service.listar().subscribe({
      next: (lista) => {
        this.tecnicos.set(lista ?? []);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeTecnicos(e, 'cargar los técnicos'));
        this.cargando.set(false);
      },
    });
  }

  protected nuevo(): void {
    this.abrir(null);
  }

  protected editar(tecnico: Tecnico): void {
    this.abrir(tecnico);
  }

  private abrir(tecnico: Tecnico | null): void {
    const ref = this.dialogo.open<TecnicoFormDialog, DatosTecnicoDialog>(TecnicoFormDialog, {
      data: { tecnico },
      autoFocus: 'first-tabbable',
    });
    ref.afterClosed().subscribe((guardado: Tecnico | undefined) => {
      if (!guardado) return;
      this.reemplazar(guardado);
      this.avisar(tecnico ? `${guardado.nombre} actualizado.` : `${guardado.nombre} agregado.`);
    });
  }

  protected desactivar(tecnico: Tecnico): void {
    this.trabajando.set(tecnico.id);
    this.service.desactivar(tecnico.id).subscribe({
      next: (t) => {
        this.reemplazar(t);
        this.trabajando.set(null);
        this.avisar(`${t.nombre} ya no aparece para asignar.`);
      },
      error: (e: unknown) => {
        this.trabajando.set(null);
        this.avisar(mensajeTecnicos(e, 'desactivar al técnico'));
      },
    });
  }

  protected reactivar(tecnico: Tecnico): void {
    this.trabajando.set(tecnico.id);
    const { nombre, email, telefono, especialidad } = tecnico;
    this.service.actualizar(tecnico.id, { nombre, email, telefono, especialidad, activo: true }).subscribe({
      next: (t) => {
        this.reemplazar(t);
        this.trabajando.set(null);
        this.avisar(`${t.nombre} vuelve a estar disponible.`);
      },
      error: (e: unknown) => {
        this.trabajando.set(null);
        this.avisar(mensajeTecnicos(e, 'reactivar al técnico'));
      },
    });
  }

  private reemplazar(tecnico: Tecnico): void {
    this.tecnicos.update((lista) => {
      const sin = lista.filter((t) => t.id !== tecnico.id);
      return [...sin, tecnico].sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
  }

  private avisar(texto: string): void {
    this.aviso.open(texto, 'Cerrar', { duration: 4000 });
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
