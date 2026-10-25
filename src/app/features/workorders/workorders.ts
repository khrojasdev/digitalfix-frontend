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
import { catchError, forkJoin, of } from 'rxjs';

import { AuthContextService } from '../../core/auth/auth-context.service';
import { descargarCsv, fechaParaArchivo } from '../../core/util/exportar-csv';
import { CatalogoService } from '../catalog/catalogo.service';
import { Servicio } from '../catalog/catalogo.models';
import { FILTRO_VACIO, FiltroOrdenes, filtrarOrdenes, hayFiltro } from './filtro-ordenes';
import { DatosNuevaOrden, NuevaOrdenDialog } from './nueva-orden.dialog';
import {
  ESTADOS,
  ESTADOS_ABIERTOS,
  EstadoOrden,
  NOMBRE_ESTADO,
  Orden,
  OrdenesService,
  TRANSICIONES,
  mensajeOrdenes,
} from './ordenes.service';

/**
 * Ordenes de trabajo de la empresa: resumen, filtros, creacion y cambio de
 * estado. Todo pasa por el BFF, que filtra por la empresa del token.
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
  protected readonly nombreEstado: Record<string, string> = NOMBRE_ESTADO;
  protected readonly transiciones: Record<string, EstadoOrden[]> = TRANSICIONES;
  protected readonly columnas = ['id', 'servicio', 'estado', 'asignadoA', 'fechaCreacion', 'fechaActualizacion', 'acciones'];

  /** Crear: quien opera o solicita. Cambiar estado: quien gestiona. AUDITOR solo mira. */
  protected readonly puedeCrear$ = this.authContext.tieneAlguno$(['ADMIN', 'SUPERVISOR', 'CLIENTE']);
  protected readonly puedeGestionar$ = this.authContext.tieneAlguno$(['ADMIN', 'SUPERVISOR']);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly ordenes = signal<Orden[]>([]);
  protected readonly servicios = signal<Servicio[]>([]);
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
    forkJoin({
      ordenes: this.service.listar(),
      // Los nombres de servicio son un extra: si el catalogo falla, la lista
      // de ordenes se muestra igual con el numero de servicio.
      servicios: this.catalogo.listarServicios(0, 500, false).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ ordenes, servicios }) => {
        this.ordenes.set(ordenes ?? []);
        this.servicios.set(servicios?.content ?? []);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeOrdenes(e, 'cargar las órdenes'));
        this.cargando.set(false);
      },
    });
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
    const ref = this.dialogo.open<NuevaOrdenDialog, DatosNuevaOrden>(NuevaOrdenDialog, {
      data: { servicios: this.serviciosActivos() },
      autoFocus: 'first-tabbable',
    });
    ref.afterClosed().subscribe((orden: Orden | undefined) => {
      if (orden) {
        this.ordenes.update((lista) => [orden, ...lista]);
        this.avisar(`Orden #${orden.id} creada.`);
      }
    });
  }

  protected cambiarEstado(orden: Orden, nuevo: EstadoOrden): void {
    this.cambiando.set(orden.id);
    this.service.cambiarEstado(orden.id, nuevo).subscribe({
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
      ['Orden', 'Código servicio', 'Servicio', 'Estado', 'Asignada a', 'Comentarios', 'Creada', 'Actualizada'],
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
