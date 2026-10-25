import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Notificaciones } from './notificaciones';
import { environment } from '../../../environments/environment';

describe('Notificaciones', () => {
  let fixture: ComponentFixture<Notificaciones>;
  let http: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notificaciones],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(Notificaciones);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${base}/api/avisos`).flush([
      { ordenId: 7, tipoEvento: 'CREADA', mensaje: 'Orden creada', empresaId: 1, fechaEvento: '2026-10-01T10:00:00', fechaAviso: '2026-10-01T10:00:05' },
      { ordenId: 8, tipoEvento: 'CERRADA', mensaje: 'Orden cerrada', empresaId: 1, fechaEvento: '2026-10-20T10:00:00', fechaAviso: '2026-10-20T10:00:05' },
    ]);
    http.expectOne(`${base}/api/avisos/stock`).flush([
      { repuestoId: 1, sku: 'BRK-16A', mensaje: 'Stock bajo mínimo', empresaId: 1, fechaAviso: '2026-10-15T09:00:00' },
    ]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('muestra los dos tipos de aviso, el más reciente primero', () => {
    const c = fixture.componentInstance as any;
    expect(c.avisosVisibles().map((a: any) => a.ordenId)).toEqual([8, 7]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('BRK-16A');
  });

  it('filtra por tipo de evento, texto y fechas', () => {
    const c = fixture.componentInstance as any;
    c.tipo.set('CREADA');
    expect(c.avisosVisibles().map((a: any) => a.ordenId)).toEqual([7]);
    c.limpiar();
    c.texto.set('#8');
    expect(c.avisosVisibles().map((a: any) => a.ordenId)).toEqual([8]);
    c.limpiar();
    c.desde.set('2026-10-10');
    expect(c.avisosVisibles().map((a: any) => a.ordenId)).toEqual([8]);
    expect(c.stockVisibles()).toHaveLength(1);
  });
});
