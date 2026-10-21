import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Audit } from './audit';

describe('Audit', () => {
  let fixture: ComponentFixture<Audit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Audit],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Audit);
    fixture.detectChanges();
  });

  it('se crea', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deja claro que la bitacora es inmutable', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Auditoría');
    expect(texto).toContain('inmutable');
  });
});
