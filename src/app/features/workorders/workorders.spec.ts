import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Workorders } from './workorders';

describe('Workorders', () => {
  let component: Workorders;
  let fixture: ComponentFixture<Workorders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Workorders],
    }).compileComponents();

    fixture = TestBed.createComponent(Workorders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
