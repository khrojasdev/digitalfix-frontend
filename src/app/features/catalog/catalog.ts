import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatSlideToggleModule,
    MatTooltipModule,
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

  /**
   * Busqueda y rango de tarifa. El catalogo pagina en el servidor y no acepta
   * busqueda, asi que este filtro trabaja sobre la pagina cargada (se puede
   * subir a 100 por pagina). "Solo activos" si va al servidor.
   */
  protected readonly filtro = signal<FiltroCatalogo>({ texto: '', tarifaMin: null, tarifaMax: null });
  protected readonly filtrando = computed(() => {
    const f = this.filtro();
    return !!f.texto.trim() || f.tarifaMin !== null || f.tarifaMax !== null;
  });
  protected readonly visibles = computed(() => filtrarServicios(this.servicios(), this.filtro()));

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
          this.error.set(mensajeDeError(e, 'cargar el catálogo'));
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

  protected actualizarFiltro(cambio: Partial<FiltroCatalogo>): void {
    this.filtro.update((f) => ({ ...f, ...normalizarTarifas(cambio) }));
  }

  protected limpiarFiltros(): void {
    this.filtro.set({ texto: '', tarifaMin: null, tarifaMax: null });
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

  /**
   * Deshace una baja.
   *
   * No pide confirmacion, al reves que desactivar: reactivar no destruye
   * nada y si alguien se equivoca, el boton de al lado lo revierte. Pedir
   * confirmacion para algo reversible solo entrena a la gente a decir que si
   * sin leer.
   */
  protected reactivar(servicio: Servicio): void {
    this.error.set(null);
    this.catalogo.reactivarServicio(servicio.id).subscribe({
      next: () => {
        this.aviso.set(`Servicio ${servicio.codigo} reactivado.`);
        this.cargar();
      },
      error: (e) => this.error.set(mensajeDeError(e, 'reactivar el servicio')),
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

export interface FiltroCatalogo {
  texto: string;
  tarifaMin: number | null;
  tarifaMax: number | null;
}

/** Filtra servicios por texto (codigo, nombre, descripcion; sin tildes) y rango de tarifa. */
export function filtrarServicios(servicios: Servicio[], filtro: FiltroCatalogo): Servicio[] {
  const texto = sinTildes(filtro.texto);
  return servicios.filter((s) => {
    if (filtro.tarifaMin !== null && s.tarifa < filtro.tarifaMin) return false;
    if (filtro.tarifaMax !== null && s.tarifa > filtro.tarifaMax) return false;
    if (texto && !sinTildes(`${s.codigo} ${s.nombre} ${s.descripcion ?? ''}`).includes(texto)) return false;
    return true;
  });
}

// Un input numerico vacio llega como null o como cadena vacia: ambos = sin limite.
function normalizarTarifas(cambio: Partial<FiltroCatalogo>): Partial<FiltroCatalogo> {
  const salida = { ...cambio };
  for (const clave of ['tarifaMin', 'tarifaMax'] as const) {
    if (clave in salida) {
      const valor = salida[clave] as unknown;
      salida[clave] = valor === '' || valor === null || valor === undefined || Number.isNaN(Number(valor)) ? null : Number(valor);
    }
  }
  return salida;
}

function sinTildes(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
