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
});
