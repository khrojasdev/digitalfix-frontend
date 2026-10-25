import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { AuthContextService } from '../../core/auth/auth-context.service';
import { CatalogoService } from '../catalog/catalogo.service';
import { Repuesto, Servicio } from '../catalog/catalogo.models';
import { mensajeDeError } from '../catalog/mensaje-error';
import { ESTADOS, ESTADOS_ABIERTOS, NOMBRE_ESTADO, Orden, OrdenesService } from '../workorders/ordenes.service';

const COLOR_ESTADO: Record<string, string> = {
  CREADA: 'var(--df-info)',
  ASIGNADA: 'var(--df-violeta)',
  INICIADA: 'var(--df-aviso)',
  CERRADA: 'var(--df-exito)',
  CANCELADA: 'var(--df-peligro)',
};

/**
 * Panel de la empresa.
 *
 * Todo lo que muestra sale de llamadas reales a traves del BFF, que ya filtra
 * por la empresa del token: el catalogo (servicios y repuestos) y las ordenes
 * de trabajo. No hay ningun numero fijo.
 *
 * Las ordenes se piden aparte y con su propio manejo de error: si ese
 * servicio falla, el panel del catalogo se sigue viendo.
 */
@Component({
  selector: 'app-dashboard',
  imports: [AsyncPipe, DatePipe, MatIconModule, MatButtonModule, MatProgressBarModule, MatTableModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private catalogo = inject(CatalogoService);
  private ordenesService = inject(OrdenesService);
  protected readonly authContext = inject(AuthContextService);

  protected readonly nombreEstado: Record<string, string | undefined> = NOMBRE_ESTADO;
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly servicios = signal<Servicio[]>([]);
  protected readonly bajoMinimo = signal<Repuesto[]>([]);
  protected readonly totalRepuestos = signal(0);
  /** null = no se pudieron cargar (el resto del panel se muestra igual). */
  protected readonly ordenes = signal<Orden[] | null>(null);

  protected readonly columnasStock = ['sku', 'nombre', 'stock', 'stockMinimo'];

  protected readonly totalServicios = computed(() => this.servicios().length);
  protected readonly serviciosActivos = computed(() => this.servicios().filter((s) => s.activo).length);
  protected readonly serviciosInactivos = computed(() => this.totalServicios() - this.serviciosActivos());

  /** Suma de las tarifas de lo que la empresa puede vender hoy. */
  protected readonly valorCatalogo = computed(() =>
    this.servicios()
      .filter((s) => s.activo)
      .reduce((suma, s) => suma + (s.tarifa ?? 0), 0),
  );

  protected readonly abiertas = computed(
    () => (this.ordenes() ?? []).filter((o) => ESTADOS_ABIERTOS.includes(o.estado)).length,
  );
  protected readonly cerradas = computed(() => (this.ordenes() ?? []).filter((o) => o.estado === 'CERRADA').length);
  protected readonly tasaCierre = computed(() => {
    const total = (this.ordenes() ?? []).length;
    return total ? Math.round((this.cerradas() / total) * 100) : 0;
  });

  protected readonly barrasEstado = computed(() => {
    const lista = this.ordenes() ?? [];
    const conteo = ESTADOS.map((e) => lista.filter((o) => o.estado === e).length);
    const maximo = Math.max(1, ...conteo);
    return ESTADOS.map((e, i) => ({ nombre: NOMBRE_ESTADO[e], valor: conteo[i], ancho: (conteo[i] / maximo) * 100, color: COLOR_ESTADO[e] }));
  });

  protected readonly recientes = computed(() =>
    [...(this.ordenes() ?? [])].sort((a, b) => (b.fechaCreacion ?? '').localeCompare(a.fechaCreacion ?? '')).slice(0, 5),
  );

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    // soloActivos en false a proposito: el panel tiene que poder contar los
    // dados de baja, que es justo lo que no se ve en el listado por defecto.
    forkJoin({
      servicios: this.catalogo.listarServicios(0, 200, false),
      repuestos: this.catalogo.listarRepuestos(0, 1),
      criticos: this.catalogo.repuestosBajoMinimo(),
      ordenes: this.ordenesService.listar().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ servicios, repuestos, criticos, ordenes }) => {
        this.servicios.set(servicios.content);
        this.totalRepuestos.set(repuestos.totalElements);
        this.bajoMinimo.set(criticos);
        this.ordenes.set(ordenes);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e, 'cargar el panel'));
        this.cargando.set(false);
      },
    });
  }

  protected nombreServicio(id: number): string {
    return this.servicios().find((s) => s.id === id)?.nombre ?? `Servicio #${id}`;
  }

  protected moneda(valor: number): string {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor);
  }

  protected saludo(): string {
    const hora = new Date().getHours();
    return hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  }
}
