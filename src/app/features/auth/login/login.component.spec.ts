import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MsalService } from '@azure/msal-angular';

import { LoginComponent } from './login.component';

// El componente se llama LoginComponent, no Login: con el nombre equivocado
// el proyecto entero no compilaba en pruebas y `ng test` quedaba rojo para
// todos. Ademas necesita MsalService, que en pruebas se reemplaza por un
// doble: nadie quiere que un test abra una redireccion a Microsoft.
describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let redirecciones: unknown[];

  beforeEach(async () => {
    redirecciones = [];

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        {
          provide: MsalService,
          useValue: {
            loginRedirect: (peticion?: unknown) => {
              redirecciones.push(peticion);
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(component).toBeTruthy();
  });

  it('iniciar sesion redirige sin peticion especial', () => {
    component.iniciarSesion();

    expect(redirecciones.length).toBe(1);
    expect(redirecciones[0]).toBeUndefined();
  });

  it('crear cuenta pide el flujo de registro', () => {
    component.crearCuenta();

    expect(redirecciones.length).toBe(1);
    expect(redirecciones[0]).toEqual({ scopes: ['user.read'], prompt: 'create' });
  });
});
