import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Audit } from './audit';
import { environment } from '../../../environments/environment';

describe('Audit', () => {
  let fixture: ComponentFixture<Audit>;
  let http: HttpTestingController;
  const base = environment.apiUrl;
  const evento = {
    id: 1, tipoEvento: 'CREADA', ordenId: 9, autorId: 'oid-1', empresaId: 7,
    fecha: '2026-10-18T12:00:00', correlacionId: null, eventKey: 'k1',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Audit],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Audit);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide los eventos paginados y ordenados por fecha al iniciar', () => {
    fixture.detectChanges();
    const peticion = http.expectOne((r) => r.url === `${base}/api/audit/events`);
    expect(peticion.request.params.get('page')).toBe('0');
    expect(peticion.request.params.get('size')).toBe('20');
    expect(peticion.request.params.get('sort')).toBe('fecha,desc');
    expect(peticion.request.params.has('tipoEvento')).toBe(false);
    peticion.flush({ content: [], totalElements: 0 });
  });

  it('muestra los eventos recibidos', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${base}/api/audit/events`).flush({ content: [evento], totalElements: 1 });
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Auditoría');
    expect(texto).toContain('Creada');
    expect(texto).toContain('#9');
  });

  it('envía los filtros al servidor y vuelve a la primera página', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${base}/api/audit/events`).flush({ content: [evento], totalElements: 40 });

    const c = fixture.componentInstance as any;
    c.pagina.set(1);
    c.actualizarFiltro({ tipoEvento: 'CERRADA', autorId: ' oid-1 ', desde: '2026-10-01', hasta: '2026-10-31' });
    c.aplicar();

    const peticion = http.expectOne((r) => r.url === `${base}/api/audit/events`);
    expect(peticion.request.params.get('page')).toBe('0');
    expect(peticion.request.params.get('tipoEvento')).toBe('CERRADA');
    expect(peticion.request.params.get('autorId')).toBe('oid-1');
    expect(peticion.request.params.get('desde')).toBe('2026-10-01T00:00:00');
    expect(peticion.request.params.get('hasta')).toBe('2026-10-31T23:59:59');
    peticion.flush({ content: [], totalElements: 0 });
  });

  it('explica el 403 con los roles que sí pueden entrar', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${base}/api/audit/events`).flush(null, { status: 403, statusText: 'Forbidden' });
    expect((fixture.componentInstance as any).error()).toContain('AUDITOR');
  });
});
