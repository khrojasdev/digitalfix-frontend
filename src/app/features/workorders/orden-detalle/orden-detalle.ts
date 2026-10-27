import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { AuthContextService } from '../../../core/auth/auth-context.service';
import { CatalogoService } from '../../catalog/catalogo.service';
import { AsignarTecnicoDialog, DatosAsignacion } from '../asignar-tecnico.dialog';
import { CambioConfirmado, CambioEstadoDialog, DatosCambioEstado } from '../cambio-estado.dialog';
import {
  CambioDeEstado,
  EstadoOrden,
  NOMBRE_ESTADO,
  Orden,
  OrdenesService,
  TRANSICIONES,
  admiteAsignacion,
  mensajeOrdenes,
  pasoDelTecnico,
} from '../ordenes.service';

/**
 * Detalle de una orden: sus datos, las acciones que el rol permite y el
 * historial completo (quien hizo cada paso, cuando y con que comentario).
 * El backend decide quien la puede ver: el cliente las suyas, el tecnico las
 * asignadas y el resto de los roles las de su empresa.
 */
@Component({
  selector: 'app-orden-detalle',
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatButtonModule, MatIconModule, MatProgressBarModule, RouterLink],
  templateUrl: './orden-detalle.html',
  styleUrl: './orden-detalle.scss',
})
export class OrdenDetalle implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly service = inject(OrdenesService);
  private readonly catalogo = inject(CatalogoService);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);
  private readonly authContext = inject(AuthContextService);

  protected readonly nombreEstado: Record<string, string | undefined> = NOMBRE_ESTADO;
  protected readonly gestiona$ = this.authContext.tieneAlguno$(['ADMIN', 'SUPERVISOR']);
  protected readonly esTecnico$ = this.authContext.tieneAlguno$(['TECNICO']);
  protected readonly veAuditoria$ = this.authContext.tieneAlguno$(['ADMIN', 'AUDITOR']);

  protected readonly id = signal<number>(0);
  protected readonly cargando = signal(false);
  protected readonly trabajando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly orden = signal<Orden | null>(null);
  protected readonly historial = signal<CambioDeEstado[]>([]);
  protected readonly nombreServicio = signal<string | null>(null);

  protected readonly transiciones = computed<EstadoOrden[]>(() => {
    const o = this.orden();
    return o ? TRANSICIONES[o.estado] ?? [] : [];
  });
  protected readonly puedeAsignar = computed(() => {
    const o = this.orden();
    return !!o && admiteAsignacion(o.estado);
  });
  protected readonly pasoTecnico = computed(() => {
    const o = this.orden();
    return o ? pasoDelTecnico(o.estado) : null;
  });
  /** El historial del mas reciente al mas antiguo. */
  protected readonly pasos = computed(() => [...this.historial()].reverse());

  ngOnInit(): void {
    this.id.set(Number(this.ruta.snapshot.paramMap.get('id')));
    this.cargar();
  }

  protected cargar(): void {
    if (!Number.isInteger(this.id()) || this.id() <= 0) {
      this.error.set('El número de orden no es válido.');
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.service.detalle(this.id()).subscribe({
      next: (detalle) => {
        this.orden.set(detalle.orden);
        this.historial.set(detalle.historial ?? []);
        this.cargando.set(false);
        this.buscarServicio(detalle.orden.servicioId);
      },
      error: (e: unknown) => {
        this.error.set(mensajeOrdenes(e, 'cargar la orden'));
        this.cargando.set(false);
      },
    });
  }

  private buscarServicio(servicioId: number): void {
    this.catalogo
      .obtenerServicio(servicioId)
      .pipe(catchError(() => of(null)))
      .subscribe((s) => this.nombreServicio.set(s ? `${s.codigo} · ${s.nombre}` : `Servicio #${servicioId}`));
  }

  protected cambiarA(destino: EstadoOrden, accion?: string): void {
    const o = this.orden();
    if (!o) return;
    const ref = this.dialogo.open<CambioEstadoDialog, DatosCambioEstado, CambioConfirmado>(CambioEstadoDialog, {
      data: { ordenId: o.id, destino, accion },
      autoFocus: 'first-tabbable',
    });
    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.trabajando.set(true);
      this.service.cambiarEstado(o.id, destino, confirmado.comentario).subscribe({
        next: () => {
          this.trabajando.set(false);
          this.aviso.open(`Orden #${o.id}: ${NOMBRE_ESTADO[destino]}.`, 'Cerrar', { duration: 4000 });
          this.cargar();
        },
        error: (e: unknown) => {
          this.trabajando.set(false);
          this.aviso.open(mensajeOrdenes(e, 'cambiar el estado'), 'Cerrar', { duration: 5000 });
        },
      });
    });
  }

  protected asignar(): void {
    const o = this.orden();
    if (!o) return;
    const ref = this.dialogo.open<AsignarTecnicoDialog, DatosAsignacion>(AsignarTecnicoDialog, {
      data: { orden: o, servicio: this.nombreServicio() ?? `Servicio #${o.servicioId}` },
      autoFocus: 'first-tabbable',
    });
    ref.afterClosed().subscribe((actualizada: Orden | undefined) => {
      if (actualizada) this.cargar();
    });
  }
}
