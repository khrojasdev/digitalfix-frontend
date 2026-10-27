import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Observable, map, tap } from 'rxjs';

import { AuthContextService } from '../../core/auth/auth-context.service';
import { descargarCsv, fechaParaArchivo } from '../../core/util/exportar-csv';
import { CatalogoService } from '../catalog/catalogo.service';
import { Servicio } from '../catalog/catalogo.models';
import { FILTRO_VACIO, FiltroOrdenes, filtrarOrdenes, hayFiltro } from './filtro-ordenes';
import { AsignarTecnicoDialog, DatosAsignacion } from './asignar-tecnico.dialog';
import { CambioConfirmado, CambioEstadoDialog, DatosCambioEstado } from './cambio-estado.dialog';
import { DatosNuevaOrden, NuevaOrdenDialog } from './nueva-orden.dialog';
import {
  ESTADOS,
  ESTADOS_ABIERTOS,
  EstadoOrden,
  NOMBRE_ESTADO,
  Orden,
  OrdenesService,
  TRANSICIONES,
  admiteAsignacion,
  mensajeOrdenes,
} from './ordenes.service';

/**
 * Ordenes de trabajo de la empresa: resumen, filtros, creacion, asignacion de
 * tecnico y cambio de estado. Todo pasa por el BFF, que filtra por la empresa
 * del token.
 */
@Component({
  selector: 'app-workorders',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    RouterLink,
  ],
  templateUrl: './workorders.html',
  styleUrl: './workorders.scss',
})
export class Workorders implements OnInit {
  private readonly service = inject(OrdenesService);
  private readonly catalogo = inject(CatalogoService);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);
  private readonly authContext = inject(AuthContextService);

  protected readonly estados = ESTADOS;
  // Indexados por string porque en la plantilla la fila de mat-table llega sin tipo.
  protected readonly nombreEstado: Record<string, string | undefined> = NOMBRE_ESTADO;
  protected readonly transiciones: Record<string, EstadoOrden[]> = TRANSICIONES;
  protected readonly admiteAsignacion = admiteAsignacion;
  protected readonly columnas = ['id', 'servicio', 'estado', 'asignadoA', 'fechaCreacion', 'fechaActualizacion', 'acciones'];

  /** Crear: quien opera o solicita. Cambiar estado: quien gestiona. AUDITOR solo mira. */
  protected readonly puedeCrear$ = this.authContext.tieneAlguno$(['ADMIN', 'SUPERVISOR', 'CLIENTE']);
  protected readonly puedeGestionar$ = this.authContext.tieneAlguno$(['ADMIN', 'SUPERVISOR']);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly ordenes = signal<Orden[]>([]);
  protected readonly servicios = signal<Servicio[]>([]);
  /** Por que no se pudo leer el catalogo; null si se leyo bien. */
  protected readonly errorCatalogo = signal<string | null>(null);
  protected readonly abriendo = signal(false);
  protected readonly cambiando = signal<number | null>(null);

  protected readonly filtro = signal<FiltroOrdenes>({ ...FILTRO_VACIO });
  protected readonly pagina = signal(0);
  protected readonly tamano = signal(10);

  private readonly nombres = computed(() => new Map(this.servicios().map((s) => [s.id, s])));
  protected readonly serviciosActivos = computed(() => this.servicios().filter((s) => s.activo));

  protected readonly filtradas = computed(() =>
    filtrarOrdenes(this.ordenes(), this.filtro(), (id) => this.nombreServicio(id)).sort(
      (a, b) => (b.fechaCreacion ?? '').localeCompare(a.fechaCreacion ?? ''),
    ),
  );
  protected readonly visibles = computed(() => {
    const desde = this.pagina() * this.tamano();
    return this.filtradas().slice(desde, desde + this.tamano());
  });
  protected readonly filtrando = computed(() => hayFiltro(this.filtro()));

  protected readonly total = computed(() => this.ordenes().length);
  protected readonly abiertas = computed(
    () => this.ordenes().filter((o) => ESTADOS_ABIERTOS.includes(o.estado)).length,
  );
  protected readonly cerradas = computed(() => this.ordenes().filter((o) => o.estado === 'CERRADA').length);
  protected readonly canceladas = computed(() => this.ordenes().filter((o) => o.estado === 'CANCELADA').length);

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    // Ordenes y servicios se cargan por separado: antes iban en un forkJoin y,
    // si fallaba una de las dos, la otra quedaba vacia. Eso hacia que el
    // dialogo de nueva orden dijera "no hay servicios" aunque el catalogo si
    // tuviera, cuando lo que fallaba era el listado de ordenes (o al reves).
    this.service.listar().subscribe({
      next: (ordenes) => {
        this.ordenes.set(ordenes ?? []);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeOrdenes(e, 'cargar las órdenes'));
        this.cargando.set(false);
      },
    });
    this.pedirServicios().subscribe({
      next: (servicios) => this.servicios.set(servicios),
      error: () => undefined,
    });
  }

  /** Pide el catalogo y deja anotado el motivo si no se puede leer. */
  private pedirServicios(): Observable<Servicio[]> {
    this.errorCatalogo.set(null);
    return this.catalogo.listarServicios(0, 100, false).pipe(
      map((pagina) => pagina?.content ?? []),
      tap({ error: (e: unknown) => this.errorCatalogo.set(mensajeCatalogo(e)) }),
    );
  }

  protected nombreServicio(id: number): string {
    const s = this.nombres().get(id);
    return s ? s.nombre : `Servicio #${id}`;
  }

  protected codigoServicio(id: number): string | null {
    return this.nombres().get(id)?.codigo ?? null;
  }

  protected actualizarFiltro(cambio: Partial<FiltroOrdenes>): void {
    this.filtro.update((f) => ({ ...f, ...cambio }));
    this.pagina.set(0);
  }

  protected limpiarFiltros(): void {
    this.filtro.set({ ...FILTRO_VACIO });
    this.pagina.set(0);
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
  }

  protected nuevaOrden(): void {
    // Si al cargar la pagina no llegaron servicios, se vuelve a pedir el
    // catalogo antes de abrir: puede haber sido un fallo puntual.
    if (this.serviciosActivos().length > 0) {
      this.abrirDialogo();
      return;
    }
    this.abriendo.set(true);
    this.pedirServicios().subscribe({
      next: (servicios) => {
        this.servicios.set(servicios);
        this.abriendo.set(false);
        this.abrirDialogo();
      },
      error: () => {
        this.abriendo.set(false);
        this.abrirDialogo();
      },
    });
  }

  private abrirDialogo(): void {
    const ref = this.dialogo.open<NuevaOrdenDialog, DatosNuevaOrden>(NuevaOrdenDialog, {
      data: { servicios: this.serviciosActivos(), errorCatalogo: this.errorCatalogo() },
      autoFocus: 'first-tabbable',
    });
    ref.afterClosed().subscribe((orden: Orden | undefined) => {
      if (orden) {
        this.ordenes.update((lista) => [orden, ...lista]);
        this.avisar(`Orden #${orden.id} creada.`);
      }
    });
  }

  /** Abre la eleccion de tecnico; al confirmar, la orden vuelve ASIGNADA. */
  protected asignar(orden: Orden): void {
    const ref = this.dialogo.open<AsignarTecnicoDialog, DatosAsignacion>(AsignarTecnicoDialog, {
      data: { orden, servicio: this.nombreServicio(orden.servicioId) },
      autoFocus: 'first-tabbable',
    });
    ref.afterClosed().subscribe((actualizada: Orden | undefined) => {
      if (!actualizada) return;
      this.ordenes.update((lista) => lista.map((o) => (o.id === actualizada.id ? actualizada : o)));
      this.ajustarPagina();
      this.avisar(`Orden #${actualizada.id} asignada a ${actualizada.asignadoA ?? 'un técnico'}.`);
    });
  }

  /** Pide un comentario opcional y despues cambia el estado. */
  protected confirmarCambio(orden: Orden, nuevo: EstadoOrden): void {
    const ref = this.dialogo.open<CambioEstadoDialog, DatosCambioEstado, CambioConfirmado>(CambioEstadoDialog, {
      data: { ordenId: orden.id, destino: nuevo },
      autoFocus: 'first-tabbable',
    });
    ref.afterClosed().subscribe((confirmado) => {
      if (confirmado) this.cambiarEstado(orden, nuevo, confirmado.comentario);
    });
  }

  protected cambiarEstado(orden: Orden, nuevo: EstadoOrden, comentario?: string | null): void {
    this.cambiando.set(orden.id);
    this.service.cambiarEstado(orden.id, nuevo, comentario).subscribe({
      next: (actualizada) => {
        this.ordenes.update((lista) => lista.map((o) => (o.id === actualizada.id ? actualizada : o)));
        this.ajustarPagina();
        this.cambiando.set(null);
        this.avisar(`Orden #${orden.id}: ${NOMBRE_ESTADO[nuevo]}.`);
      },
      error: (e: unknown) => {
        this.cambiando.set(null);
        this.avisar(mensajeOrdenes(e, 'cambiar el estado'));
      },
    });
  }

  protected exportar(): void {
    descargarCsv(
      `ordenes-${fechaParaArchivo()}.csv`,
      ['Orden', 'Código servicio', 'Servicio', 'Estado', 'Técnico', 'Comentarios', 'Creada', 'Actualizada'],
      this.filtradas().map((o) => [
        o.id,
        this.codigoServicio(o.servicioId),
        this.nombreServicio(o.servicioId),
        NOMBRE_ESTADO[o.estado] ?? o.estado,
        o.asignadoA,
        o.comentarios,
        o.fechaCreacion,
        o.fechaActualizacion,
      ]),
    );
  }

  /**
   * Si la pagina actual quedo vacia (por ejemplo, la orden cambio de estado y
   * salio del filtro activo), vuelve a la ultima pagina con filas.
   */
  private ajustarPagina(): void {
    const ultima = Math.max(0, Math.ceil(this.filtradas().length / this.tamano()) - 1);
    if (this.pagina() > ultima) {
      this.pagina.set(ultima);
    }
  }

  private avisar(texto: string): void {
    this.aviso.open(texto, 'Cerrar', { duration: 4000 });
  }
}

/** Mensaje para la persona cuando no se puede leer el catalogo. */
export function mensajeCatalogo(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor para leer el catálogo.';
    if (error.status === 401) return 'La sesión expiró. Vuelve a iniciar sesión.';
    if (error.status === 403) {
      return 'Tu usuario no tiene permiso para leer el catálogo. Revisa el rol asignado a tu cuenta en Entra ID.';
    }
    if (error.status === 503) return 'El catálogo no está disponible en este momento. Intenta de nuevo en unos segundos.';
    return `No se pudo leer el catálogo (error ${error.status}).`;
  }
  return 'No se pudo leer el catálogo.';
}
