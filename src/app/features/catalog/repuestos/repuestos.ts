import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';

import { CatalogoService } from '../catalogo.service';
import { Repuesto } from '../catalogo.models';
import { mensajeDeError } from '../mensaje-error';
import { RepuestoForm } from './repuesto-form';

/** Repuestos de la empresa, con su stock y su stock minimo. */
@Component({
  selector: 'app-repuestos',
  imports: [
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatPaginatorModule,
    RouterLink,
    RepuestoForm,
  ],
  templateUrl: './repuestos.html',
  styleUrl: './repuestos.scss',
})
export class Repuestos implements OnInit {
  private catalogo = inject(CatalogoService);

  protected readonly columnas = ['sku', 'nombre', 'stock', 'minimo', 'costo', 'acciones'];

  protected readonly repuestos = signal<Repuesto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly total = signal(0);
  protected readonly pagina = signal(0);
  protected readonly tamano = signal(20);

  protected readonly formularioAbierto = signal(false);
  protected readonly enEdicion = signal<Repuesto | null>(null);
  protected readonly confirmando = signal<number | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.catalogo.listarRepuestos(this.pagina(), this.tamano()).subscribe({
      next: (pagina) => {
        this.repuestos.set(pagina.content);
        this.total.set(pagina.totalElements);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e, 'cargar los repuestos'));
        this.repuestos.set([]);
        this.total.set(0);
        this.cargando.set(false);
      },
    });
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.cargar();
  }

  protected nuevo(): void {
    this.enEdicion.set(null);
    this.formularioAbierto.set(true);
    this.aviso.set(null);
  }

  protected editar(repuesto: Repuesto): void {
    this.enEdicion.set(repuesto);
    this.formularioAbierto.set(true);
    this.aviso.set(null);
  }

  protected cerrarFormulario(): void {
    this.formularioAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected alGuardar(repuesto: Repuesto): void {
    this.aviso.set(`Repuesto ${repuesto.sku} guardado.`);
    this.cerrarFormulario();
    this.cargar();
  }

  protected pedirConfirmacion(repuesto: Repuesto): void {
    this.confirmando.set(repuesto.id);
  }

  protected cancelarConfirmacion(): void {
    this.confirmando.set(null);
  }

  protected desactivar(repuesto: Repuesto): void {
    this.confirmando.set(null);
    this.error.set(null);
    this.catalogo.desactivarRepuesto(repuesto.id).subscribe({
      next: () => {
        this.aviso.set(`Repuesto ${repuesto.sku} desactivado.`);
        this.cargar();
      },
      error: (e) => this.error.set(mensajeDeError(e, 'desactivar el repuesto')),
    });
  }

  protected moneda(valor: number | null): string {
    if (valor === null || valor === undefined) {
      return '—';
    }
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(valor);
  }
}
