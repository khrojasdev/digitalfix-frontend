import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Reports } from './reports';

describe('Reports', () => {
  let fixture: ComponentFixture<Reports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Reports);
    fixture.detectChanges();
  });

  it('se crea', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('anuncia lo que permitira hacer', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Reportes');
    expect(texto).toContain('En construcción');
    expect(texto).toContain('Tiempo medio de resolución');
  });
});
