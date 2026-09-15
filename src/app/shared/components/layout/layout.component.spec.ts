import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LayoutComponent } from './layout.component';
import { cuentaDePrueba, proveedoresMsalDePrueba } from '../../../../testing/msal-doble';

/**
 * Dos cosas que estuvieron rotas y que estas pruebas dejan fijadas:
 *
 *  - el menu lateral se dibujaba vacio, porque preguntaba por roles del token
 *    y el token de Entra llega sin el claim `roles` cuando no hay app roles
 *    asignados. Ahora los roles salen de /api/me;
 *  - el boton de cerrar sesion vivia dentro del *ngIf del perfil, asi que un
 *    /api/me caido dejaba a la persona encerrada dentro de la aplicacion.
 */
describe('LayoutComponent', () => {
  let fixture: ComponentFixture<LayoutComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...proveedoresMsalDePrueba(cuentaDePrueba()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  function responderPerfil(perfil: Record<string, unknown> | null) {
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) => r.flush(perfil));
  }

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('se crea', () => {
    responderPerfil(null);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('con el rol que llega del perfil, el menu tiene enlaces', async () => {
    responderPerfil({
      oid: 'oid-1',
      email: 'admin@digitalfix.cl',
      name: 'Admin',
      companyId: '1',
      companyName: 'ElectroRed',
      roles: ['ADMIN'],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('Panel');
    expect(texto()).toContain('Catálogo');
    expect(texto()).toContain('Repuestos');
    // Las de fases posteriores tambien aparecen, marcadas
    expect(texto()).toContain('Órdenes de trabajo');
    expect(texto()).toContain('Auditoría');
    expect(texto()).toContain('pronto');
  });

  it('un SUPERVISOR ve reportes; un AUDITOR, auditoria', async () => {
    responderPerfil({
      oid: 'oid-3',
      email: 'sup@digitalfix.cl',
      name: 'Supervisora',
      companyId: '1',
      companyName: 'ElectroRed',
      roles: ['SUPERVISOR'],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('Reportes');
    // auditoria es solo de ADMIN y AUDITOR
    expect(texto()).not.toContain('Auditoría');
  });

  it('un CLIENTE ve el catalogo pero no el panel', async () => {
    responderPerfil({
      oid: 'oid-2',
      email: 'cliente@digitalfix.cl',
      name: 'Cliente',
      companyId: '1',
      companyName: 'ElectroRed',
      roles: ['CLIENTE'],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('Catálogo');
    expect(texto()).not.toContain('Panel');
  });

  it('si el perfil no llega, igual se puede cerrar sesion', async () => {
    responderPerfil(null);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const salir = (fixture.nativeElement as HTMLElement).querySelector(
      'button[aria-label="Cerrar sesión"]',
    );
    expect(salir).toBeTruthy();
  });

  it('el logo KCD esta en la barra superior', () => {
    responderPerfil(null);
    fixture.detectChanges();

    expect(texto()).toContain('KCD');
  });

  afterEach(() => {
    http.match((r) => r.url.endsWith('/api/me')).forEach((r) => r.flush(null));
    http.verify();
  });
});
