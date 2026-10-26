import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map } from 'rxjs';

import { CatalogoService } from '../../catalog/catalogo.service';
import { Servicio } from '../../catalog/catalogo.models';
import {
  EstadoOrden,
  NOMBRE_ESTADO,
  Orden,
  OrdenesService,
  mensajeOrdenes,
  pasoDelTecnico,
} from '../ordenes.service';
import { Tecnico } from '../tecnicos/tecnicos.service';

type Vista = 'pendientes' | 'todas';

/**
 * Pantalla del TECNICO: las ordenes que tiene asignadas y un boton por orden
 * con el siguiente paso en terreno (salir, iniciar, cerrar). Cada paso pasa
 * por las mismas reglas del backend y queda en auditoria con su cuenta.
 */
@Component({
  selector: 'app-mis-ordenes',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatButtonToggleModule, MatIconModule, MatProgressBarModule],
  templateUrl: './mis-ordenes.html',
  styleUrl: './mis-ordenes.scss',
})
export class MisOrdenes implements OnInit {
  private readonly service = inject(OrdenesService);
  private readonly catalogo = inject(CatalogoService);
  private readonly aviso = inject(MatSnackBar);

  protected readonly nombreEstado: Record<string, string | undefined> = NOMBRE_ESTADO;
  protected readonly pasoDelTecnico = pasoDelTecnico;

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly tecnico = signal<Tecnico | null>(null);
  protected readonly ordenes = signal<Orden[]>([]);
  protected readonly servicios = signal<Map<number, Servicio>>(new Map());
  protected readonly cambiando = signal<number | null>(null);
  protected readonly vista = signal<Vista>('pendientes');

  protected readonly pendientes = computed(() => this.ordenes().filter((o) => pasoDelTecnico(o.estado) !== null));
  protected readonly enTerreno = computed(
    () => this.ordenes().filter((o) => o.estado === 'EN_DESPLAZAMIENTO' || o.estado === 'EN_EJECUCION').length,
  );
  protected readonly cerradas = computed(() => this.ordenes().filter((o) => o.estado === 'CERRADA').length);
  protected readonly visibles = computed(() => (this.vista() === 'pendientes' ? this.pendientes() : this.ordenes()));

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service.misOrdenes().subscribe({
      next: (datos) => {
        this.tecnico.set(datos?.tecnico ?? null);
        this.ordenes.set(datos?.ordenes ?? []);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeOrdenes(e, 'cargar tus órdenes'));
        this.cargando.set(false);
      },
    });
    // Los nombres de los servicios son un extra: si el catalogo falla, se
    // muestra el numero del servicio y la pantalla sigue funcionando.
    this.catalogo
      .listarServicios(0, 100, false)
      .pipe(map((pagina) => new Map((pagina?.content ?? []).map((s) => [s.id, s]))))
      .subscribe({ next: (mapa) => this.servicios.set(mapa), error: () => undefined });
  }

  protected nombreServicio(id: number): string {
    return this.servicios().get(id)?.nombre ?? `Servicio #${id}`;
  }

  protected avanzar(orden: Orden): void {
    const paso = pasoDelTecnico(orden.estado);
    if (!paso) return;
    this.cambiando.set(orden.id);
    this.service.cambiarEstado(orden.id, paso.destino).subscribe({
      next: (actualizada) => {
        this.ordenes.update((lista) => lista.map((o) => (o.id === actualizada.id ? actualizada : o)));
        this.cambiando.set(null);
        this.aviso.open(`Orden #${orden.id}: ${NOMBRE_ESTADO[paso.destino as EstadoOrden]}.`, 'Cerrar', { duration: 4000 });
      },
      error: (e: unknown) => {
        this.cambiando.set(null);
        this.aviso.open(mensajeOrdenes(e, 'actualizar la orden'), 'Cerrar', { duration: 5000 });
      },
    });
  }
}
