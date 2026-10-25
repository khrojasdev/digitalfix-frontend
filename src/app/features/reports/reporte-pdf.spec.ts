import { crearReportePdf } from './reporte-pdf';

describe('crearReportePdf', () => {
  it('arma el PDF con el título, la empresa y las tablas del reporte', async () => {
    const doc = await crearReportePdf({
      empresa: 'ElectroRed',
      autor: 'Christian',
      periodo: 'Ultimos 7 dias',
      generado: new Date(2026, 9, 25, 10, 0),
      ordenesTotales: 10,
      tiempoMedioMinutos: 125,
      conteoPorEstado: { CERRADA: 6, CREADA: 4 },
      ranking: [{ codigo: 'SRV-001', nombre: 'Termografia', solicitudes: 4 }],
    });

    const contenido = doc.output();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(contenido).toContain('DigitalFix');
    expect(contenido).toContain('ElectroRed');
    expect(contenido).toContain('SRV-001');
    expect(contenido).toContain('Termografia');
  });

  it('incluye la fuente y el detalle de órdenes cuando se le pasan', async () => {
    const doc = await crearReportePdf({
      empresa: 'ElectroRed',
      autor: 'Christian',
      periodo: 'Ultimas 24 horas',
      generado: new Date(2026, 9, 25, 10, 0),
      ordenesTotales: 2,
      tiempoMedioMinutos: null,
      conteoPorEstado: { CREADA: 2 },
      ranking: [],
      fuente: 'Calculado desde las ordenes de trabajo',
      ordenes: [
        { id: 7, servicio: 'Termografia', estado: 'Creada', creada: '25-10-26 22:31', asignadoA: null },
        { id: 6, servicio: 'Tablero', estado: 'Asignada', creada: '25-10-26 22:30', asignadoA: 'tecnico-1' },
      ],
    });
    const contenido = doc.output();
    expect(contenido).toContain('Detalle de');
    expect(contenido).toContain('#7');
    expect(contenido).toContain('tecnico-1');
    expect(contenido).toContain('Calculado desde las ordenes');
  });
});
