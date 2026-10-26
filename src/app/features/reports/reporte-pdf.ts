import { NOMBRE_TIPO_EVENTO } from '../workorders/ordenes.service';
import { formatoDuracion } from './reportes.service';

export interface DatosReporte {
  empresa: string;
  autor: string;
  periodo: string;
  generado: Date;
  ordenesTotales: number;
  tiempoMedioMinutos: number | null;
  conteoPorEstado: Record<string, number>;
  ranking: Array<{ codigo: string | null; nombre: string; solicitudes: number }>;
  /** De donde salen los indicadores (se imprime bajo la ficha). */
  fuente?: string;
  /** Detalle de las ordenes del periodo, con los filtros aplicados. */
  ordenes?: Array<{ id: number; servicio: string; estado: string; creada: string; asignadoA: string | null }>;
}

const AZUL: [number, number, number] = [12, 35, 64];
const NARANJO: [number, number, number] = [234, 122, 31];
const GRIS: [number, number, number] = [95, 105, 120];

/**
 * Arma el reporte de operaciones en PDF y lo descarga.
 *
 * jsPDF se carga solo al generar el reporte (import dinamico): pesa lo
 * suyo y no tiene sentido que lo descargue quien nunca usa esta funcion.
 */
export async function descargarReportePdf(datos: DatosReporte, nombreArchivo: string): Promise<void> {
  const doc = await crearReportePdf(datos);
  doc.save(nombreArchivo);
}

/** Arma el documento sin descargarlo (separado para poder probarlo). */
export async function crearReportePdf(datos: DatosReporte): Promise<import('jspdf').jsPDF> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const margen = 16;

  // Encabezado con franja de marca.
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, ancho, 30, 'F');
  doc.setFillColor(...NARANJO);
  doc.rect(0, 30, ancho, 1.6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('DigitalFix · Reporte de operaciones', margen, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${datos.empresa}  ·  ${datos.periodo}`, margen, 22);

  // Ficha del reporte.
  doc.setTextColor(...GRIS);
  doc.setFontSize(9);
  const fecha = datos.generado.toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' });
  doc.text(`Generado el ${fecha} por ${datos.autor}`, margen, 40);
  if (datos.fuente) {
    doc.text(`Fuente de los indicadores: ${datos.fuente}`, margen, 45);
  }

  // Indicadores.
  const cerradas = datos.conteoPorEstado['CERRADA'] ?? 0;
  const canceladas = datos.conteoPorEstado['CANCELADA'] ?? 0;
  const abiertas = Math.max(datos.ordenesTotales - cerradas - canceladas, 0);
  const tasaCierre = datos.ordenesTotales ? Math.round((cerradas / datos.ordenesTotales) * 100) : 0;

  titulo(doc, 'Indicadores', 50, margen);
  autoTable(doc, {
    startY: 54,
    margin: { left: margen, right: margen },
    head: [['Indicador', 'Valor']],
    body: [
      ['Órdenes en el período', String(datos.ordenesTotales)],
      ['Órdenes abiertas', String(abiertas)],
      ['Órdenes cerradas', `${cerradas} (${tasaCierre}%)`],
      ['Órdenes canceladas', String(canceladas)],
      ['Tiempo medio de resolución', formatoDuracion(datos.tiempoMedioMinutos)],
    ],
    theme: 'grid',
    headStyles: { fillColor: AZUL, textColor: 255 },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  });

  // Distribucion por estado.
  let y = ultimaY(doc) + 10;
  titulo(doc, 'Órdenes por estado', y, margen);
  const estados = Object.entries(datos.conteoPorEstado);
  autoTable(doc, {
    startY: y + 4,
    margin: { left: margen, right: margen },
    head: [['Estado', 'Órdenes', '% del total']],
    body: estados.length
      ? estados.map(([estado, n]) => [
          NOMBRE_TIPO_EVENTO[estado] ?? estado,
          String(n),
          datos.ordenesTotales ? `${Math.round((n / datos.ordenesTotales) * 100)}%` : '0%',
        ])
      : [['Sin órdenes en el período', '—', '—']],
    theme: 'striped',
    headStyles: { fillColor: AZUL, textColor: 255 },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  });

  // Ranking de servicios.
  y = ultimaY(doc) + 10;
  titulo(doc, 'Servicios más solicitados', y, margen);
  autoTable(doc, {
    startY: y + 4,
    margin: { left: margen, right: margen },
    head: [['#', 'Código', 'Servicio', 'Solicitudes']],
    body: datos.ranking.length
      ? datos.ranking.map((r, i) => [String(i + 1), r.codigo ?? '—', r.nombre, String(r.solicitudes)])
      : [['—', '—', 'Sin solicitudes en el período', '—']],
    theme: 'striped',
    headStyles: { fillColor: AZUL, textColor: 255 },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 10 }, 3: { halign: 'right' } },
  });

  // Detalle de ordenes.
  if (datos.ordenes) {
    y = ultimaY(doc) + 10;
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 20;
    }
    titulo(doc, `Detalle de órdenes (${datos.ordenes.length})`, y, margen);
    autoTable(doc, {
      startY: y + 4,
      margin: { left: margen, right: margen },
      head: [['N°', 'Servicio', 'Estado', 'Creada', 'Asignada a']],
      body: datos.ordenes.length
        ? datos.ordenes.map((o) => [`#${o.id}`, o.servicio, o.estado, o.creada, o.asignadoA ?? '—'])
        : [['—', 'Sin órdenes en el período', '—', '—', '—']],
      theme: 'striped',
      headStyles: { fillColor: AZUL, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 14 } },
    });
  }

  // Pie con numero de pagina en todas las hojas.
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    const alto = doc.internal.pageSize.getHeight();
    doc.text('DigitalFix · Reporte generado desde la plataforma', margen, alto - 8);
    doc.text(`Página ${i} de ${paginas}`, ancho - margen, alto - 8, { align: 'right' });
  }

  return doc;
}

function titulo(doc: import('jspdf').jsPDF, texto: string, y: number, margen: number): void {
  doc.setTextColor(...AZUL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(texto, margen, y);
  doc.setFont('helvetica', 'normal');
}

function ultimaY(doc: unknown): number {
  return (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60;
}
