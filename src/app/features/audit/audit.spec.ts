import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { Audit } from './audit';
import { environment } from '../../../environments/environment';
import { cuentaDePrueba, proveedoresMsalDePrueba } from '../../../testing/msal-doble';

describe('Audit', () => {
  let fixture: ComponentFixture<Audit>;
  let http: HttpTestingController;
  const base = environment.apiUrl;
  const evento = {
    id: 1, tipoEvento: 'CREADA', ordenId: 9, autorId: 'oid-1', empresaId: 7,
    fecha: '2026-10-18T12:00:00', correlacionId: null, eventKey: 'k1',
  };
  const eventoDeOtro = { ...evento, id: 2, ordenId: 10, autorId: 'oid-2', eventKey: 'k2' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Audit],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...proveedoresMsalDePrueba(cuentaDePrueba(['ADMIN'])),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Audit);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) => r.flush(null));
    http.match((r) => r.url.includes('/api/usuarios/')).forEach((r) => r.flush(null, { status: 404, statusText: 'Not Found' }));
    http.verify();
  });

  /** La consulta de la tabla (pagina de 20). */
  function principal(): TestRequest {
    return http.expectOne((r) => r.url === `${base}/api/audit/events` && r.params.get('size') !== '200');
  }

  /** La lectura de autores para el buscador (pagina de 200, una vez al entrar). */
  function autores(): TestRequest {
    return http.expectOne((r) => r.url === `${base}/api/audit/events` && r.params.get('size') === '200');
  }

  function perfil(oid = 'oid-1', name = 'Christian Pérez', email = 'chri.perezv@duocuc.cl') {
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) =>
      r.flush({ oid, email, name, companyId: '1', companyName: 'E', roles: ['ADMIN'] }),
    );
  }

  it('pide los eventos paginados y ordenados por fecha al iniciar', () => {
    fixture.detectChanges();
    perfil();
    const peticion = principal();
    expect(peticion.request.params.get('page')).toBe('0');
    expect(peticion.request.params.get('size')).toBe('20');
    expect(peticion.request.params.get('sort')).toBe('fecha,desc');
    expect(peticion.request.params.has('tipoEvento')).toBe(false);
    peticion.flush({ content: [], totalElements: 0 });
    autores().flush({ content: [], totalElements: 0 });
  });

  it('muestra los eventos recibidos', () => {
    fixture.detectChanges();
    perfil();
    principal().flush({ content: [evento], totalElements: 1 });
    autores().flush({ content: [], totalElements: 0 });
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Auditoría');
    expect(texto).toContain('Creada');
    expect(texto).toContain('#9');
  });

  it('envía los filtros al servidor y vuelve a la primera página', () => {
    fixture.detectChanges();
    perfil();
    principal().flush({ content: [evento], totalElements: 40 });
    autores().flush({ content: [], totalElements: 0 });

    const c = fixture.componentInstance as any;
    c.pagina.set(1);
    c.actualizarFiltro({ tipoEvento: 'CERRADA', autorId: ' oid-1 ', desde: '2026-10-01', hasta: '2026-10-31' });
    c.aplicar();

    const peticion = principal();
    expect(peticion.request.params.get('page')).toBe('0');
    expect(peticion.request.params.get('tipoEvento')).toBe('CERRADA');
    expect(peticion.request.params.get('autorId')).toBe('oid-1');
    expect(peticion.request.params.get('desde')).toBe('2026-10-01T00:00:00');
    expect(peticion.request.params.get('hasta')).toBe('2026-10-31T23:59:59');
    peticion.flush({ content: [], totalElements: 0 });
  });

  it('explica el 403 con los roles que sí pueden entrar', () => {
    fixture.detectChanges();
    perfil();
    principal().flush(null, { status: 403, statusText: 'Forbidden' });
    autores().flush(null, { status: 403, statusText: 'Forbidden' });
    expect((fixture.componentInstance as any).error()).toContain('AUDITOR');
  });

  it('muestra el nombre del autor en vez del oid', () => {
    fixture.detectChanges();
    perfil('oid-yo', 'Kevin Henríquez', 'kevin@duocuc.cl');
    principal().flush({ content: [eventoDeOtro], totalElements: 1 });
    autores().flush({ content: [eventoDeOtro], totalElements: 1 });
    http.expectOne(`${base}/api/usuarios/oid-2`).flush({ oid: 'oid-2', nombre: 'Christian Pérez', email: 'chri.perezv@duocuc.cl', rol: 'ADMIN' });
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Christian Pérez');
    expect(texto).not.toContain('oid-2');
  });

  it('si no encuentra el nombre, muestra el oid acortado', () => {
    fixture.detectChanges();
    perfil('oid-yo');
    const largo = { ...evento, autorId: '9409e83d-343e-4dec-9049-fc067f6a8ff8' };
    principal().flush({ content: [largo], totalElements: 1 });
    autores().flush({ content: [], totalElements: 0 });
    http.expectOne(`${base}/api/usuarios/9409e83d-343e-4dec-9049-fc067f6a8ff8`).flush(null, { status: 404, statusText: 'Not Found' });
    expect((fixture.componentInstance as any).etiqueta(largo.autorId)).toBe('9409e83d-343e-…');
  });

  it('sugiere personas por nombre y al elegir una filtra por su oid', () => {
    fixture.detectChanges();
    perfil('oid-yo', 'Kevin Henríquez', 'kevin@duocuc.cl');
    principal().flush({ content: [], totalElements: 0 });
    autores().flush({ content: [eventoDeOtro], totalElements: 1 });
    http.expectOne(`${base}/api/usuarios/oid-2`).flush({ oid: 'oid-2', nombre: 'Christian Pérez', email: 'chri.perezv@duocuc.cl', rol: 'ADMIN' });

    const c = fixture.componentInstance as any;
    c.escribirUsuario('christian');
    expect(c.sugerencias().map((p: any) => p.oid)).toEqual(['oid-2']);

    c.elegirUsuario('oid-2');
    const peticion = principal();
    expect(peticion.request.params.get('autorId')).toBe('oid-2');
    expect(c.textoUsuario()).toBe('Christian Pérez');
    peticion.flush({ content: [eventoDeOtro], totalElements: 1 });
  });

  it('si se escribe un nombre y se busca sin elegir, usa la única coincidencia', () => {
    fixture.detectChanges();
    perfil('oid-yo', 'Kevin Henríquez', 'kevin@duocuc.cl');
    principal().flush({ content: [], totalElements: 0 });
    autores().flush({ content: [eventoDeOtro], totalElements: 1 });
    http.expectOne(`${base}/api/usuarios/oid-2`).flush({ oid: 'oid-2', nombre: 'Christian Pérez', email: 'chri.perezv@duocuc.cl', rol: 'ADMIN' });

    const c = fixture.componentInstance as any;
    c.escribirUsuario('perez');
    c.aplicar();
    const peticion = principal();
    expect(peticion.request.params.get('autorId')).toBe('oid-2');
    peticion.flush({ content: [], totalElements: 0 });
  });

  it('el botón Mis acciones filtra por la persona que inició sesión', () => {
    fixture.detectChanges();
    perfil('oid-yo', 'Kevin Henríquez', 'kevin@duocuc.cl');
    principal().flush({ content: [], totalElements: 0 });
    autores().flush({ content: [], totalElements: 0 });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mis acciones');
    const c = fixture.componentInstance as any;
    c.misAcciones();
    const peticion = principal();
    expect(peticion.request.params.get('autorId')).toBe('oid-yo');
    expect(c.textoUsuario()).toBe('Kevin Henríquez (tú)');
    peticion.flush({ content: [], totalElements: 0 });
  });
});

describe('Audit desde el detalle de una orden', () => {
  const base = environment.apiUrl;

  it('con ?ordenId=N filtra los eventos de esa orden y muestra su detalle', async () => {
    await TestBed.configureTestingModule({
      imports: [Audit],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...proveedoresMsalDePrueba(cuentaDePrueba(['ADMIN'])),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ ordenId: '9' }) } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Audit);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const peticiones = http.match((r) => r.url === `${base}/api/audit/events` && r.params.get('size') !== '200');
    const ultima = peticiones[peticiones.length - 1];
    expect(ultima.request.params.get('ordenId')).toBe('9');
    peticiones.forEach((p) =>
      p.flush({
        content: [{
          id: 3, tipoEvento: 'ESTADO_CAMBIADO', ordenId: 9, autorId: 'oid-1', empresaId: 7, fecha: '2026-10-18T12:00:00',
          correlacionId: 'c-1', eventKey: 'k3', detalle: 'Comentario: Voy en camino',
        }],
        totalElements: 1,
      }),
    );
    http.match((r) => r.url === `${base}/api/audit/events`).forEach((r) => r.flush({ content: [], totalElements: 0 }));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Comentario: Voy en camino');

    http.match((r) => r.url.endsWith('/api/me')).forEach((r) => r.flush(null));
    http.match((r) => r.url.includes('/api/usuarios/')).forEach((r) => r.flush(null, { status: 404, statusText: 'Not Found' }));
    http.verify();
  });
});
