import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { AuthContextService } from '../../core/auth/auth-context.service';
import { descargarCsv, fechaParaArchivo } from '../../core/util/exportar-csv';
import { NOMBRE_TIPO_EVENTO, TIPOS_DE_EVENTO } from '../workorders/ordenes.service';
import { AuditoriaService, EventoAuditoria, FILTRO_AUDITORIA_VACIO, FiltroAuditoria } from './auditoria.service';
import { UsuarioResumen, UsuariosService } from './usuarios.service';

/** Una persona que aparece en la auditoria, con lo que se sepa de ella. */
export interface PersonaAuditoria {
  oid: string;
  nombre: string | null;
  email: string | null;
}

/**
 * Vista de auditoria: los eventos que registra ms-digitalfix-audit al consumir
 * la mensajeria, a traves del BFF, con filtros por tipo, usuario y fechas.
 *
 * El usuario se busca por nombre, correo u oid: los autores se muestran con su
 * nombre (GET /api/usuarios/{oid}) y el buscador sugiere a las personas que ya
 * aparecen en la auditoria.
 */
@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    RouterLink,
  ],
  templateUrl: './audit.html',
})
export class Audit implements OnInit {
  private readonly service = inject(AuditoriaService);
  private readonly usuarios = inject(UsuariosService);
  private readonly authContext = inject(AuthContextService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly tipos = TIPOS_DE_EVENTO;
  protected readonly nombreTipo: Record<string, string | undefined> = NOMBRE_TIPO_EVENTO;
  protected readonly columnas = ['fecha', 'tipoEvento', 'ordenId', 'autorId', 'detalle', 'correlacionId'];

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly eventos = signal<EventoAuditoria[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(0);
  protected readonly tamano = signal(20);
  protected readonly filtro = signal<FiltroAuditoria>({ ...FILTRO_AUDITORIA_VACIO });

  /** Personas conocidas por oid: null mientras no se sabe su nombre. */
  protected readonly personas = signal<Map<string, UsuarioResumen | null>>(new Map());
  protected readonly miOid = signal<string | null>(null);
  /** Lo escrito en el buscador de usuario (o el nombre de la persona elegida). */
  protected readonly textoUsuario = signal('');

  protected readonly conocidos = computed<PersonaAuditoria[]>(() =>
    [...this.personas().entries()]
      .map(([oid, p]) => ({ oid, nombre: p?.nombre ?? null, email: p?.email ?? null }))
      .sort((a, b) => (a.nombre ?? a.email ?? a.oid).localeCompare(b.nombre ?? b.email ?? b.oid)),
  );

  protected readonly sugerencias = computed(() => {
    const buscado = sinTildes(this.textoUsuario());
    return this.conocidos()
      .filter((p) => !buscado || sinTildes(`${p.nombre ?? ''} ${p.email ?? ''} ${p.oid}`).includes(buscado))
      .slice(0, 10);
  });

  protected readonly hay = computed(() => this.eventos().length > 0);
  protected readonly filtrando = computed(() => {
    const f = this.filtro();
    return !!(f.tipoEvento || f.ordenId || f.autorId || f.desde || f.hasta);
  });

  ngOnInit(): void {
    // Desde el detalle de una orden se llega con ?ordenId=N: su timeline.
    const orden = this.ruta.snapshot.queryParamMap.get('ordenId');
    if (orden && /^\d+$/.test(orden)) {
      this.actualizarFiltro({ ordenId: orden });
    }
    this.authContext.profile$.pipe(take(1)).subscribe((perfil) => {
      if (!perfil?.oid) return;
      this.miOid.set(perfil.oid);
      this.recordar(perfil.oid, { oid: perfil.oid, nombre: perfil.name || null, email: perfil.email || null, rol: null });
    });
    this.cargar();
    this.cargarAutores();
  }

  /**
   * Una sola vez al entrar: lee una pagina grande de eventos solo para saber
   * quienes aparecen y ofrecerlos en el buscador, aunque no esten en la pagina
   * que se esta viendo.
   */
  private cargarAutores(): void {
    this.service.eventos(0, 200).subscribe({
      next: (pagina) => this.conocer((pagina?.content ?? []).map((e) => e.autorId)),
      error: () => undefined,
    });
  }

  /** Pide el nombre de los oid que todavia no se conocen. */
  private conocer(oids: Array<string | null>): void {
    const nuevos = [...new Set(oids.filter((o): o is string => !!o))].filter((o) => !this.personas().has(o));
    for (const oid of nuevos) {
      this.recordar(oid, null);
      this.usuarios.resumen(oid).subscribe((resumen) => {
        if (resumen) this.recordar(oid, resumen);
      });
    }
  }

  private recordar(oid: string, resumen: UsuarioResumen | null): void {
    this.personas.update((mapa) => new Map(mapa).set(oid, resumen));
  }

  /** Como se muestra a una persona: nombre, si no correo, si no el oid acortado. */
  protected etiqueta(oid: string | null): string {
    if (!oid) return '—';
    const p = this.personas().get(oid);
    const base = p?.nombre || p?.email || (oid.length > 14 ? oid.slice(0, 14) + '…' : oid);
    return oid === this.miOid() ? `${base} (tú)` : base;
  }

  protected detalle(oid: string): string {
    const p = this.personas().get(oid);
    return [p?.email, oid].filter(Boolean).join(' · ');
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service.eventos(this.pagina(), this.tamano(), this.filtro()).subscribe({
      next: (pagina) => {
        this.eventos.set(pagina?.content ?? []);
        this.total.set(pagina?.totalElements ?? 0);
        this.cargando.set(false);
        this.conocer(this.eventos().map((e) => e.autorId));
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
    this.resolverUsuarioEscrito();
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiar(): void {
    this.filtro.set({ ...FILTRO_AUDITORIA_VACIO });
    this.textoUsuario.set('');
    this.aplicar();
  }

  /** Al escribir en el buscador se suelta la persona elegida antes. */
  protected escribirUsuario(texto: string): void {
    this.textoUsuario.set(texto ?? '');
    if (this.filtro().autorId) this.actualizarFiltro({ autorId: '' });
  }

  protected elegirUsuario(oid: string): void {
    this.actualizarFiltro({ autorId: oid });
    this.textoUsuario.set(this.etiqueta(oid));
    this.aplicar();
  }

  protected misAcciones(): void {
    const oid = this.miOid();
    if (oid) this.elegirUsuario(oid);
  }

  /**
   * Si se escribio algo sin elegir de la lista: si coincide con una sola
   * persona conocida se usa esa; si no, se toma lo escrito como oid.
   */
  private resolverUsuarioEscrito(): void {
    const texto = this.textoUsuario().trim();
    if (!texto || this.filtro().autorId) return;
    const coincidencias = this.sugerencias();
    this.actualizarFiltro({ autorId: coincidencias.length === 1 ? coincidencias[0].oid : texto });
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.cargar();
  }

  protected filtrarPorAutor(autorId: string | null): void {
    if (!autorId) return;
    this.elegirUsuario(autorId);
  }

  protected exportar(): void {
    descargarCsv(
      `auditoria-${fechaParaArchivo()}.csv`,
      ['Fecha', 'Evento', 'Orden', 'Autor', 'Correo', 'Autor (oid)', 'Detalle', 'Correlación', 'Clave de evento'],
      this.eventos().map((e) => {
        const p = e.autorId ? this.personas().get(e.autorId) : null;
        return [e.fecha, e.tipoEvento, e.ordenId, p?.nombre ?? '', p?.email ?? '', e.autorId, e.detalle ?? '', e.correlacionId, e.eventKey];
      }),
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

function sinTildes(valor: string): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
