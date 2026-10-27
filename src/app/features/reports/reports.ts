import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';

import { AuthContextService } from '../../core/auth/auth-context.service';
import { descargarCsv, fechaParaArchivo } from '../../core/util/exportar-csv';
import { CatalogoService } from '../catalog/catalogo.service';
import { Servicio } from '../catalog/catalogo.models';
import { ESTADOS, NOMBRE_ESTADO, Orden, OrdenesService } from '../workorders/ordenes.service';
import { ordenesEnPeriodo, porHoraDesdeOrdenes, rankingDesdeOrdenes, resumirOrdenes } from './resumen-ordenes';
import { descargarReportePdf } from './reporte-pdf';
import {
  Indicadores,
  OrdenesPorHora,
  PERIODOS,
  Periodo,
  ReportesService,
  ServicioRanking,
  formatoDuracion,
} from './reportes.service';

const COLOR_ESTADO: Record<string, string> = {
  CREADA: 'var(--df-info)',
  ASIGNADA: 'var(--df-violeta)',
  EN_DESPLAZAMIENTO: 'var(--df-acento)',
  EN_EJECUCION: 'var(--df-aviso)',
  CERRADA: 'var(--df-exito)',
  CANCELADA: 'var(--df-peligro)',
};

/**
 * Reportes de operacion: indicadores y ranking de servicios del periodo
 * elegido, desde ms-digitalfix-report a traves del BFF, el detalle de las
 * ordenes del periodo (desde ms-workorders) y descarga del reporte en PDF o CSV.
 *
 * Los indicadores salen de ms-report, que los arma con los eventos que recibe
 * por RabbitMQ. Si ms-report no tiene datos del periodo (o no responde), se
 * calculan desde las ordenes, y la pantalla dice de donde salen.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements OnInit {
  private readonly service = inject(ReportesService);
  private readonly catalogo = inject(CatalogoService);
  private readonly ordenesService = inject(OrdenesService);
  private readonly authContext = inject(AuthContextService);
  private readonly aviso = inject(MatSnackBar);

  protected readonly periodos = PERIODOS;
  protected readonly duracion = formatoDuracion;

  protected readonly periodo = signal<Periodo>('24h');
  protected readonly cargando = signal(false);
  protected readonly generando = signal(false);
  /** Error al leer ms-report (indicadores y ranking). */
  protected readonly error = signal<string | null>(null);
  protected readonly errorOrdenes = signal<string | null>(null);
  private readonly indicadoresReport = signal<Indicadores | null>(null);
  private readonly rankingReport = signal<ServicioRanking[]>([]);
  private readonly porHoraReport = signal<OrdenesPorHora[]>([]);
  private readonly ordenes = signal<Orden[]>([]);
  private readonly servicios = signal<Map<number, Servicio>>(new Map());

  protected readonly estados = ESTADOS;
  protected readonly nombreEstado: Record<string, string | undefined> = NOMBRE_ESTADO;
  protected readonly filtroEstado = signal('');
  protected readonly filtroServicio = signal<number | null>(null);
  protected readonly columnasOrdenes = ['id', 'servicio', 'estado', 'fechaCreacion', 'asignadoA'];

  /** Ordenes creadas dentro del periodo elegido. */
  protected readonly ordenesPeriodo = computed(() =>
    ordenesEnPeriodo(this.ordenes(), this.periodo()).sort((a, b) =>
      (b.fechaCreacion ?? '').localeCompare(a.fechaCreacion ?? ''),
    ),
  );
  protected readonly ordenesFiltradas = computed(() =>
    this.ordenesPeriodo()
      .filter((o) => !this.filtroEstado() || o.estado === this.filtroEstado())
      .filter((o) => this.filtroServicio() === null || o.servicioId === this.filtroServicio()),
  );
  /** Servicios que aparecen en las ordenes del periodo, para el filtro. */
  protected readonly serviciosEnPeriodo = computed(() =>
    [...new Set(this.ordenesPeriodo().map((o) => o.servicioId))].map((id) => ({ id, nombre: this.nombreServicio(id) })),
  );

  /** De donde salen los indicadores que se muestran. */
  protected readonly fuente = computed<'report' | 'ordenes' | null>(() => {
    const report = this.indicadoresReport();
    if (report && report.ordenesTotales > 0) return 'report';
    if (this.ordenesPeriodo().length > 0) return 'ordenes';
    return report ? 'report' : null;
  });

  protected readonly indicadores = computed<Indicadores | null>(() => {
    const fuente = this.fuente();
    if (fuente === 'report') return this.indicadoresReport();
    if (fuente === 'ordenes') return resumirOrdenes(this.ordenesPeriodo());
    return null;
  });

  protected readonly ranking = computed<ServicioRanking[]>(() =>
    this.fuente() === 'ordenes' ? rankingDesdeOrdenes(this.ordenesPeriodo()) : this.rankingReport(),
  );

  /** ms-report conto menos ordenes que las que existen en el periodo. */
  protected readonly faltanEnReport = computed(() => {
    const report = this.indicadoresReport();
    if (this.fuente() !== 'report' || !report) return 0;
    return Math.max(this.ordenesPeriodo().length - report.ordenesTotales, 0);
  });

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

  /**
   * KPI del caso "ordenes por hora": cuantas ordenes se crearon en cada hora
   * del dia dentro del periodo. Sale de ms-report; si este no tiene datos, de
   * las ordenes.
   */
  protected readonly porHora = computed<OrdenesPorHora[]>(() => {
    const report = this.porHoraReport();
    if (this.fuente() === 'report' && report.some((h) => h.cantidad > 0)) return report;
    return porHoraDesdeOrdenes(this.ordenesPeriodo());
  });

  protected readonly barrasHora = computed(() => {
    const horas = this.porHora();
    const maximo = Math.max(1, ...horas.map((h) => h.cantidad));
    return horas.map((h) => ({ hora: h.hora, cantidad: h.cantidad, alto: (h.cantidad / maximo) * 100 }));
  });

  /** La hora con mas ordenes (null si no hubo ninguna). */
  protected readonly horaPunta = computed(() => {
    const horas = this.porHora();
    const mayor = horas.reduce((a, b) => (b.cantidad > a.cantidad ? b : a), { hora: -1, cantidad: 0 });
    return mayor.cantidad > 0 ? mayor : null;
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
    this.errorOrdenes.set(null);

    // Tres cargas independientes: si una falla, las otras se muestran igual.
    forkJoin({
      indicadores: this.service.indicadores(this.periodo()),
      ranking: this.service.topServicios(this.periodo()),
    }).subscribe({
      next: ({ indicadores, ranking }) => {
        this.indicadoresReport.set(indicadores);
        this.rankingReport.set(ranking ?? []);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensaje(e));
        this.indicadoresReport.set(null);
        this.rankingReport.set([]);
        this.cargando.set(false);
      },
    });

    this.service
      .ordenesPorHora(this.periodo())
      .pipe(catchError(() => of([] as OrdenesPorHora[])))
      .subscribe((horas) => this.porHoraReport.set(horas ?? []));

    this.ordenesService.listar().subscribe({
      next: (ordenes) => this.ordenes.set(ordenes ?? []),
      error: () => {
        this.ordenes.set([]);
        this.errorOrdenes.set('No se pudieron leer las órdenes de trabajo del período.');
      },
    });

    // Solo para mostrar nombres: si el catalogo falla, se muestra el id.
    this.catalogo
      .listarServicios(0, 100, false)
      .pipe(catchError(() => of(null)))
      .subscribe((servicios) => {
        if (servicios) this.servicios.set(new Map(servicios.content.map((s) => [s.id, s])));
      });
  }

  protected limpiarFiltrosOrdenes(): void {
    this.filtroEstado.set('');
    this.filtroServicio.set(null);
  }

  protected nombreServicio(id: number): string {
    return this.servicios().get(id)?.nombre ?? `Servicio #${id}`;
  }

  private filaOrden(o: Orden): { id: number; servicio: string; estado: string; creada: string; asignadoA: string | null } {
    return {
      id: o.id,
      servicio: this.nombreServicio(o.servicioId),
      estado: NOMBRE_ESTADO[o.estado] ?? o.estado,
      creada: fechaCorta(o.fechaCreacion),
      asignadoA: o.asignadoA,
    };
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
          fuente: this.fuente() === 'ordenes' ? 'Calculado desde las órdenes de trabajo' : 'Servicio de reportes (eventos de RabbitMQ)',
          ordenes: this.ordenesFiltradas().map((o) => this.filaOrden(o)),
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
      ['', '', ''],
      ['Hora del día', 'Órdenes creadas', ''],
      ...this.porHora().map((h) => [`${String(h.hora).padStart(2, '0')}:00`, h.cantidad, '']),
      ['', '', ''],
      ['Detalle de órdenes', '', ''],
      ['N°', 'Servicio', 'Estado', 'Creada', 'Asignada a'],
      ...this.ordenesFiltradas().map((o) => {
        const f = this.filaOrden(o);
        return [f.id, f.servicio, f.estado, f.creada, f.asignadoA ?? ''];
      }),
    ];
    descargarCsv(`reporte-digitalfix-${this.periodo()}-${fechaParaArchivo()}.csv`, ['Reporte de operaciones', '', ''], filas);
  }
}

function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

function mensaje(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor.';
    if (error.status === 403) return 'Los reportes están disponibles solo para el rol ADMIN.';
    if (error.status === 503) return 'El servicio de reportes no está disponible en este momento.';
  }
  return 'No se pudieron cargar los reportes.';
}
