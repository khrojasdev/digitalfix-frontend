import { MatPaginatorIntl } from '@angular/material/paginator';

/**
 * Textos del paginador en español.
 *
 * Material trae los suyos en inglés, así que una pantalla entera en español
 * terminaba con "Items per page" y "1 – 3 of 3" abajo a la derecha. Es lo
 * primero que delata que la traducción quedó a medias.
 */
export function paginadorEnEspanol(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();

  intl.itemsPerPageLabel = 'Por página:';
  intl.nextPageLabel = 'Página siguiente';
  intl.previousPageLabel = 'Página anterior';
  intl.firstPageLabel = 'Primera página';
  intl.lastPageLabel = 'Última página';

  intl.getRangeLabel = (pagina: number, tamano: number, total: number): string => {
    if (total === 0 || tamano === 0) {
      return `0 de ${total}`;
    }

    const desde = pagina * tamano;
    // El último tramo casi nunca está completo: Math.min evita anunciar
    // "21 – 40 de 33", que es lo que sale si se confía en el tamaño de página.
    const hasta = Math.min(desde + tamano, total);

    return `${desde + 1} – ${hasta} de ${total}`;
  };

  return intl;
}
