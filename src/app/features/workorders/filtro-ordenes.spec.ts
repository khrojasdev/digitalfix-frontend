import { FILTRO_VACIO, filtrarOrdenes, hayFiltro } from './filtro-ordenes';
import { Orden } from './ordenes.service';

const ordenes: Orden[] = [
  { id: 10, servicioId: 1, estado: 'CREADA', asignadoA: null, comentarios: 'Revisión urgente', fechaCreacion: '2026-10-01T10:00:00', fechaActualizacion: null },
  { id: 11, servicioId: 2, estado: 'CERRADA', asignadoA: 'ana', comentarios: null, fechaCreacion: '2026-10-15T10:00:00', fechaActualizacion: null },
];
const nombre = (id: number) => (id === 1 ? 'Termografía' : 'Puesta a tierra');

describe('filtrarOrdenes', () => {
  it('sin filtro devuelve todo', () => {
    expect(filtrarOrdenes(ordenes, FILTRO_VACIO, nombre)).toHaveLength(2);
    expect(hayFiltro(FILTRO_VACIO)).toBe(false);
  });

  it('busca sin distinguir mayúsculas ni tildes, también por nombre de servicio', () => {
    expect(filtrarOrdenes(ordenes, { ...FILTRO_VACIO, texto: 'REVISION' }, nombre).map((o) => o.id)).toEqual([10]);
    expect(filtrarOrdenes(ordenes, { ...FILTRO_VACIO, texto: 'termografia' }, nombre).map((o) => o.id)).toEqual([10]);
    expect(filtrarOrdenes(ordenes, { ...FILTRO_VACIO, texto: '#11' }, nombre).map((o) => o.id)).toEqual([11]);
  });

  it('filtra por rango de fechas inclusivo', () => {
    const f = { ...FILTRO_VACIO, desde: '2026-10-15', hasta: '2026-10-15' };
    expect(filtrarOrdenes(ordenes, f, nombre).map((o) => o.id)).toEqual([11]);
    expect(hayFiltro(f)).toBe(true);
  });

  it('filtra por servicio y estado a la vez', () => {
    expect(filtrarOrdenes(ordenes, { ...FILTRO_VACIO, servicioId: 2, estado: 'CREADA' }, nombre)).toHaveLength(0);
  });
});
