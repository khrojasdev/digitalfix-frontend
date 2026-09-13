import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';

import { CatalogoService } from './catalogo.service';
import { Servicio } from './catalogo.models';
import { mensajeDeError } from './mensaje-error';
import { ServicioForm } from './servicio-form/servicio-form';

/**
 * Listado del catalogo de servicios de la empresa del usuario.
 *
 * La empresa no se elige ni se envia: sale del token en el BFF. Por eso esta
 * pantalla no tiene selector de empresa, y no debe tenerlo nunca.
 */
@Component({
  selector: 'app-catalog',
  imports: [
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatSlideToggleModule,
    RouterLink,
    ServicioForm,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class Catalog implements OnInit {
  private catalogo = inject(CatalogoService);

  protected readonly columnas = [
    'codigo',
    'nombre',
    'descripcion',
    'tarifa',
    'estado',
    'acciones',
  ];

  protected readonly servicios = signal<Servicio[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly total = signal(0);
  protected readonly pagina = signal(0);
  protected readonly tamano = signal(20);
  protected readonly soloActivos = signal(true);

  /** null y formulario cerrado = nadie edita; null y abierto = alta. */
  protected readonly formularioAbierto = signal(false);
  protected readonly enEdicion = signal<Servicio | null>(null);
  protected readonly confirmando = signal<number | null>(null);
  protected readonly aviso = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.catalogo
      .listarServicios(this.pagina(), this.tamano(), this.soloActivos())
      .subscribe({
        next: (pagina) => {
          this.servicios.set(pagina.content);
          this.total.set(pagina.totalElements);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeDeError(e, 'cargar el catalogo'));
          this.servicios.set([]);
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

  protected alternarActivos(soloActivos: boolean): void {
    this.soloActivos.set(soloActivos);
    this.pagina.set(0);
    this.cargar();
  }

  protected nuevo(): void {
    this.enEdicion.set(null);
    this.formularioAbierto.set(true);
    this.aviso.set(null);
  }

  protected editar(servicio: Servicio): void {
    this.enEdicion.set(servicio);
    this.formularioAbierto.set(true);
    this.aviso.set(null);
  }

  protected cerrarFormulario(): void {
    this.formularioAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected alGuardar(servicio: Servicio): void {
    this.aviso.set(`Servicio ${servicio.codigo} guardado.`);
    this.cerrarFormulario();
    this.cargar();
  }

  protected pedirConfirmacion(servicio: Servicio): void {
    this.confirmando.set(servicio.id);
  }

  protected cancelarConfirmacion(): void {
    this.confirmando.set(null);
  }

  /** En el catalogo nada se borra: se desactiva, porque otros servicios
      pueden estar referenciando este identificador. */
  protected desactivar(servicio: Servicio): void {
    this.confirmando.set(null);
    this.error.set(null);
    this.catalogo.desactivarServicio(servicio.id).subscribe({
      next: () => {
        this.aviso.set(`Servicio ${servicio.codigo} desactivado.`);
        this.cargar();
      },
      error: (e) => this.error.set(mensajeDeError(e, 'desactivar el servicio')),
    });
  }

  protected moneda(valor: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(valor);
  }
}
