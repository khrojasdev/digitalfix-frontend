import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { proveedoresMsalDePrueba } from '../testing/msal-doble';

// AppComponent depende de MsalService, MsalBroadcastService y Router. Sin
// proveerlos, el spec fallaba con NG0201 antes de probar nada.
describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), ...proveedoresMsalDePrueba()],
    }).compileComponents();
  });

  it('se crea', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('solo monta el router-outlet', async () => {
    // La plantilla es unicamente <router-outlet>: todo lo que se ve lo pone
    // la ruta activa. El spec anterior buscaba el titulo del andamio de
    // Angular, que ya no existe.
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();

    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toContain('router-outlet');
  });
});
