import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { descargarCsv, fechaParaArchivo } from '../../core/util/exportar-csv';
import { ESTADOS, NOMBRE_ESTADO } from '../workorders/ordenes.service';
import { AuditoriaService, EventoAuditoria, FILTRO_AUDITORIA_VACIO, FiltroAuditoria } from './auditoria.service';

/**
 * Vista de auditoria: los eventos que registra ms-digitalfix-audit al consumir
 * la mensajeria, a traves del BFF, con filtros por tipo, autor y fechas.
 */
@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './audit.html',
})
export class Audit implements OnInit {
  private readonly service = inject(AuditoriaService);

  protected readonly tipos = ESTADOS;
  protected readonly nombreTipo: Record<string, string | undefined> = NOMBRE_ESTADO;
  protected readonly columnas = ['fecha', 'tipoEvento', 'ordenId', 'autorId', 'correlacionId'];

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly eventos = signal<EventoAuditoria[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(0);
  protected readonly tamano = signal(20);
  protected readonly filtro = signal<FiltroAuditoria>({ ...FILTRO_AUDITORIA_VACIO });

  protected readonly hay = computed(() => this.eventos().length > 0);
  protected readonly filtrando = computed(() => {
    const f = this.filtro();
    return !!(f.tipoEvento || f.autorId || f.desde || f.hasta);
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service.eventos(this.pagina(), this.tamano(), this.filtro()).subscribe({
      next: (pagina) => {
        this.eventos.set(pagina?.content ?? []);
        this.total.set(pagina?.totalElements ?? 0);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensaje(e));
        this.cargando.set(false);
      },
    });
  }

  protected actualizarFiltro(cambio: Partial<FiltroAuditoria>): void {
    this.filtro.update((f) => ({ ...f, ...cambio }));
  }

  /** Los filtros se aplican al pulsar Buscar: cada consulta va al servidor. */
  protected aplicar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiar(): void {
    this.filtro.set({ ...FILTRO_AUDITORIA_VACIO });
    this.aplicar();
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.cargar();
  }

  protected filtrarPorAutor(autorId: string | null): void {
    if (!autorId) return;
    this.actualizarFiltro({ autorId });
    this.aplicar();
  }

  protected exportar(): void {
    descargarCsv(
      `auditoria-${fechaParaArchivo()}.csv`,
      ['Fecha', 'Evento', 'Orden', 'Autor (oid)', 'Correlación', 'Clave de evento'],
      this.eventos().map((e) => [e.fecha, e.tipoEvento, e.ordenId, e.autorId, e.correlacionId, e.eventKey]),
    );
  }
}

function mensaje(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor.';
    if (error.status === 400) return 'Revisa los filtros: alguna fecha no es válida.';
    if (error.status === 403) return 'La auditoría está disponible solo para los roles ADMIN y AUDITOR.';
    if (error.status === 503) return 'El servicio de auditoría no está disponible en este momento.';
  }
  return 'No se pudieron cargar los eventos de auditoría.';
}
