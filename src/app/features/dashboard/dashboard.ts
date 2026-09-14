import { AsyncPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthContextService } from '../../core/auth/auth-context.service';
import { CatalogoService } from '../catalog/catalogo.service';
import { Repuesto, Servicio } from '../catalog/catalogo.models';
import { mensajeDeError } from '../catalog/mensaje-error';

/**
 * Panel de la empresa.
 *
 * Todo lo que muestra sale de llamadas reales al catalogo a traves del BFF,
 * que ya filtra por la empresa del token. No hay ningun numero fijo: si una
 * cifra aparece aqui es porque esta en la base.
 *
 * Se piden las dos listas a la vez con forkJoin en vez de encadenarlas: son
 * independientes, y encadenarlas sumaria las dos esperas sin ganar nada.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    AsyncPipe,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTableModule,
    RouterLink,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private catalogo = inject(CatalogoService);
  protected readonly authContext = inject(AuthContextService);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly servicios = signal<Servicio[]>([]);
  protected readonly bajoMinimo = signal<Repuesto[]>([]);
  protected readonly totalRepuestos = signal(0);

  protected readonly columnasStock = ['sku', 'nombre', 'stock', 'stockMinimo'];

  protected readonly totalServicios = computed(() => this.servicios().length);
  protected readonly serviciosActivos = computed(
    () => this.servicios().filter((s) => s.activo).length,
  );
  protected readonly serviciosInactivos = computed(
    () => this.totalServicios() - this.serviciosActivos(),
  );

  /** Suma de las tarifas de lo que la empresa puede vender hoy. */
  protected readonly valorCatalogo = computed(() =>
    this.servicios()
      .filter((s) => s.activo)
      .reduce((suma, s) => suma + (s.tarifa ?? 0), 0),
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
    }).subscribe({
      next: ({ servicios, repuestos, criticos }) => {
        this.servicios.set(servicios.content);
        this.totalRepuestos.set(repuestos.totalElements);
        this.bajoMinimo.set(criticos);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e, 'cargar el panel'));
        this.cargando.set(false);
      },
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
