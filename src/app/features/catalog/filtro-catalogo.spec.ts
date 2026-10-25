import { filtrarServicios } from './catalog';
import { Servicio } from './catalogo.models';

const servicios: Servicio[] = [
  { id: 1, codigo: 'SRV-001', nombre: 'Mantención preventiva', descripcion: 'Revisión anual', tarifa: 45000, activo: true },
  { id: 2, codigo: 'SRV-002', nombre: 'Termografía', descripcion: null, tarifa: 85000, activo: true },
  { id: 3, codigo: 'SRV-003', nombre: 'Puesta a tierra', descripcion: 'Medición con certificado', tarifa: 120000, activo: false },
];

describe('filtrarServicios', () => {
  it('busca por código, nombre o descripción sin distinguir tildes', () => {
    expect(filtrarServicios(servicios, { texto: 'mantencion', tarifaMin: null, tarifaMax: null }).map((s) => s.id)).toEqual([1]);
    expect(filtrarServicios(servicios, { texto: 'srv-002', tarifaMin: null, tarifaMax: null }).map((s) => s.id)).toEqual([2]);
    expect(filtrarServicios(servicios, { texto: 'certificado', tarifaMin: null, tarifaMax: null }).map((s) => s.id)).toEqual([3]);
  });

  it('filtra por rango de tarifa inclusivo', () => {
    expect(filtrarServicios(servicios, { texto: '', tarifaMin: 45000, tarifaMax: 85000 }).map((s) => s.id)).toEqual([1, 2]);
    expect(filtrarServicios(servicios, { texto: '', tarifaMin: 100000, tarifaMax: null }).map((s) => s.id)).toEqual([3]);
  });
});
