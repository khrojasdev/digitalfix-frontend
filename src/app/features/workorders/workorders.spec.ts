import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Workorders } from './workorders';

describe('Workorders', () => {
  let fixture: ComponentFixture<Workorders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Workorders],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Workorders);
    fixture.detectChanges();
  });

  it('se crea', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('dice que esta en construccion en vez de aparentar una pantalla vacia', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Órdenes de trabajo');
    expect(texto).toContain('En construcción');
    expect(texto).toContain('ms-digitalfix-workorders');
  });
});
