import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';

import { AuthContextService } from '../../core/auth/auth-context.service';
import { descargarCsv, fechaParaArchivo } from '../../core/util/exportar-csv';
import { CatalogoService } from '../catalog/catalogo.service';
import { Servicio } from '../catalog/catalogo.models';
import { ESTADOS, NOMBRE_ESTADO } from '../workorders/ordenes.service';
import { descargarReportePdf } from './reporte-pdf';
import { Indicadores, PERIODOS, Periodo, ReportesService, ServicioRanking, formatoDuracion } from './reportes.service';

const COLOR_ESTADO: Record<string, string> = {
  CREADA: 'var(--df-info)',
  ASIGNADA: 'var(--df-violeta)',
  INICIADA: 'var(--df-aviso)',
  CERRADA: 'var(--df-exito)',
  CANCELADA: 'var(--df-peligro)',
};

/**
 * Reportes de operacion: indicadores y ranking de servicios del periodo
 * elegido, desde ms-digitalfix-report a traves del BFF, y descarga del
 * reporte en PDF o CSV.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [MatButtonModule, MatButtonToggleModule, MatIconModule, MatProgressBarModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements OnInit {
  private readonly service = inject(ReportesService);
  private readonly catalogo = inject(CatalogoService);
  private readonly authContext = inject(AuthContextService);
  private readonly aviso = inject(MatSnackBar);

  protected readonly periodos = PERIODOS;
  protected readonly duracion = formatoDuracion;

  protected readonly periodo = signal<Periodo>('24h');
  protected readonly cargando = signal(false);
  protected readonly generando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly indicadores = signal<Indicadores | null>(null);
  protected readonly ranking = signal<ServicioRanking[]>([]);
  private readonly servicios = signal<Map<number, Servicio>>(new Map());

  protected readonly nombrePeriodo = computed(
    () => PERIODOS.find((p) => p.codigo === this.periodo())?.nombre ?? this.periodo(),
  );

  private readonly conteo = computed(() => this.indicadores()?.conteoPorEstado ?? {});
  protected readonly total = computed(() => this.indicadores()?.ordenesTotales ?? 0);
  protected readonly cerradas = computed(() => this.conteo()['CERRADA'] ?? 0);
  protected readonly canceladas = computed(() => this.conteo()['CANCELADA'] ?? 0);
  protected readonly abiertas = computed(() => Math.max(this.total() - this.cerradas() - this.canceladas(), 0));
  protected readonly tasaCierre = computed(() =>
    this.total() ? Math.round((this.cerradas() / this.total()) * 100) : 0,
  );

  /** Barras por estado, en el orden del flujo y con su color. */
  protected readonly barrasEstado = computed(() => {
    const conteo = this.conteo();
    const maximo = Math.max(1, ...ESTADOS.map((e) => conteo[e] ?? 0));
    return ESTADOS.map((e) => ({
      nombre: NOMBRE_ESTADO[e],
      valor: conteo[e] ?? 0,
      ancho: ((conteo[e] ?? 0) / maximo) * 100,
      color: COLOR_ESTADO[e],
    }));
  });

  protected readonly barrasServicio = computed(() => {
    const lista = this.ranking();
    const maximo = Math.max(1, ...lista.map((r) => r.cantidadSolicitudes));
    return lista.map((r) => ({
      nombre: this.nombreServicio(r.servicioId),
      valor: r.cantidadSolicitudes,
      ancho: (r.cantidadSolicitudes / maximo) * 100,
    }));
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected elegirPeriodo(periodo: Periodo): void {
    this.periodo.set(periodo);
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      indicadores: this.service.indicadores(this.periodo()),
      ranking: this.service.topServicios(this.periodo()),
      // Solo para mostrar nombres: si el catalogo falla, se muestra el id.
      servicios: this.catalogo.listarServicios(0, 500, false).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ indicadores, ranking, servicios }) => {
        this.indicadores.set(indicadores);
        this.ranking.set(ranking ?? []);
        if (servicios) {
          this.servicios.set(new Map(servicios.content.map((s) => [s.id, s])));
        }
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensaje(e));
        this.indicadores.set(null);
        this.ranking.set([]);
        this.cargando.set(false);
      },
    });
  }

  protected nombreServicio(id: number): string {
    return this.servicios().get(id)?.nombre ?? `Servicio #${id}`;
  }

  protected async descargarPdf(): Promise<void> {
    const indicadores = this.indicadores();
    if (!indicadores) return;
    this.generando.set(true);
    try {
      const perfil = await firstValueFrom(this.authContext.profile$);
      await descargarReportePdf(
        {
          empresa: perfil?.companyName || 'Mi empresa',
          autor: perfil?.name || perfil?.email || 'usuario',
          periodo: this.nombrePeriodo(),
          generado: new Date(),
          ordenesTotales: indicadores.ordenesTotales,
          tiempoMedioMinutos: indicadores.tiempoMedioResolucionMinutos,
          conteoPorEstado: indicadores.conteoPorEstado ?? {},
          ranking: this.ranking().map((r) => ({
            codigo: this.servicios().get(r.servicioId)?.codigo ?? null,
            nombre: this.nombreServicio(r.servicioId),
            solicitudes: r.cantidadSolicitudes,
          })),
        },
        `reporte-digitalfix-${this.periodo()}-${fechaParaArchivo()}.pdf`,
      );
    } catch {
      this.aviso.open('No se pudo generar el PDF.', 'Cerrar', { duration: 4000 });
    } finally {
      this.generando.set(false);
    }
  }

  protected descargarCsv(): void {
    const ind = this.indicadores();
    if (!ind) return;
    const filas: Array<Array<string | number | null>> = [
      ['Período', this.nombrePeriodo(), ''],
      ['Órdenes en el período', ind.ordenesTotales, ''],
      ['Tiempo medio de resolución (min)', ind.tiempoMedioResolucionMinutos ?? '', ''],
      ['', '', ''],
      ['Estado', 'Órdenes', ''],
      ...ESTADOS.map((e) => [NOMBRE_ESTADO[e], ind.conteoPorEstado?.[e] ?? 0, '']),
      ['', '', ''],
      ['Servicio', 'Código', 'Solicitudes'],
      ...this.ranking().map((r) => [
        this.nombreServicio(r.servicioId),
        this.servicios().get(r.servicioId)?.codigo ?? '',
        r.cantidadSolicitudes,
      ]),
    ];
    descargarCsv(`reporte-digitalfix-${this.periodo()}-${fechaParaArchivo()}.csv`, ['Reporte de operaciones', '', ''], filas);
  }
}

function mensaje(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor.';
    if (error.status === 403) return 'Los reportes están disponibles solo para el rol ADMIN.';
    if (error.status === 503) return 'El servicio de reportes no está disponible en este momento.';
  }
  return 'No se pudieron cargar los reportes.';
}
