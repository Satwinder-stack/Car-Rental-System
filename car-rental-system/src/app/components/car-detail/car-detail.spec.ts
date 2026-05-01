import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarDetail } from './car-detail';

describe('CarDetail', () => {
  let component: CarDetail;
  let fixture: ComponentFixture<CarDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(CarDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
