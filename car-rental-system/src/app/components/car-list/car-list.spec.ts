import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarList } from './car-list';

describe('CarList', () => {
  let component: CarList;
  let fixture: ComponentFixture<CarList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarList],
    }).compileComponents();

    fixture = TestBed.createComponent(CarList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
