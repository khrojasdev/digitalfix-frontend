/**
 * Genera un CSV y lo descarga en el navegador.
 *
 * Separador ";" y BOM UTF-8 para que Excel en español lo abra con columnas y
 * tildes correctas sin pasos extra. Cada celda va entre comillas y las
 * comillas internas se duplican, como pide el formato.
 */
export function construirCsv(encabezados: string[], filas: Array<Array<string | number | null | undefined>>): string {
  const celda = (valor: string | number | null | undefined): string =>
    `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const lineas = [encabezados, ...filas].map((fila) => fila.map(celda).join(';'));
  return '﻿' + lineas.join('\r\n');
}

export function descargarArchivo(contenido: BlobPart, nombre: string, tipo: string): void {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function descargarCsv(nombre: string, encabezados: string[], filas: Array<Array<string | number | null | undefined>>): void {
  descargarArchivo(construirCsv(encabezados, filas), nombre, 'text/csv;charset=utf-8');
}

/** Fecha de hoy como AAAA-MM-DD, para nombrar archivos. */
export function fechaParaArchivo(fecha = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}
