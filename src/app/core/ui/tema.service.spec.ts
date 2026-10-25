import { TestBed } from '@angular/core/testing';

import { TemaService } from './tema.service';

describe('TemaService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('tema-oscuro');
  });

  it('alternar pone y quita la clase tema-oscuro en <html>', () => {
    localStorage.setItem('df.tema', 'claro');
    const tema = TestBed.inject(TemaService);
    expect(tema.oscuro()).toBe(false);

    tema.alternar();
    expect(tema.oscuro()).toBe(true);
    expect(document.documentElement.classList.contains('tema-oscuro')).toBe(true);

    tema.alternar();
    expect(document.documentElement.classList.contains('tema-oscuro')).toBe(false);
  });

  it('recuerda la eleccion entre visitas', () => {
    localStorage.setItem('df.tema', 'oscuro');
    const tema = TestBed.inject(TemaService);
    expect(tema.oscuro()).toBe(true);
  });
});
