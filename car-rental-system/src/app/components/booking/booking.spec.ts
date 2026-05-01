import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { Booking } from './booking';
import { DatabaseService, Car, CarVariant } from '../../services/database';

describe('Booking', () => {
  let component: Booking;
  let fixture: ComponentFixture<Booking>;
  let mockDatabaseService: jasmine.SpyObj<DatabaseService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  const mockCar: Car = {
    id: 1,
    brand: 'Tesla',
    model: 'Model S Plaid',
    pricePerDay: 150,
    type: 'Luxury',
    imageUrl: 'https://example.com/tesla.jpg',
    isAvailable: true,
    transmission: 'Single-Speed',
    fuelType: 'Electric',
    engine: 'Tri-Motor AWD',
    variants: [
      { name: 'Pearl White', hex: '#FFFFFF', image: 'https://example.com/white.jpg' },
      { name: 'Midnight Black', hex: '#000000', image: 'https://example.com/black.jpg' }
    ]
  };

  const mockUser = {
    email: 'test@example.com',
    role: 'customer' as const,
    name: 'Test User',
    balance: 1000
  };

  beforeEach(async () => {
    // Create mock services
    mockDatabaseService = jasmine.createSpyObj('DatabaseService', ['addBooking'], {
      cars: signal([mockCar]),
      currentUser: signal(mockUser)
    });

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('1')
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [Booking],
      providers: [
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Booking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with car data from route parameter', () => {
      component.ngOnInit();

      expect(mockActivatedRoute.snapshot.paramMap.get).toHaveBeenCalledWith('id');
      expect(component.car()).toEqual(mockCar);
    });

    it('should set the first variant as default selected color', () => {
      component.ngOnInit();

      expect(component.selectedColor()).toEqual(mockCar.variants[0]);
    });

    it('should handle car not found gracefully', () => {
      mockActivatedRoute.snapshot.paramMap.get.and.returnValue('999');
      
      component.ngOnInit();

      expect(component.car()).toBeUndefined();
      expect(component.selectedColor()).toBeNull();
    });
  });

  describe('Days Management', () => {
    it('should update days within valid range (1-30)', () => {
      component.days = 5;

      component.updateDays(3);
      expect(component.days).toBe(8);

      component.updateDays(-2);
      expect(component.days).toBe(6);
    });

    it('should not allow days to go below 1', () => {
      component.days = 1;

      component.updateDays(-5);
      expect(component.days).toBe(1);
    });

    it('should not allow days to exceed 30', () => {
      component.days = 30;

      component.updateDays(5);
      expect(component.days).toBe(30);
    });
  });

  describe('Price Calculation', () => {
    it('should calculate total price correctly based on days', () => {
      component.ngOnInit();
      component.days = 5;

      fixture.detectChanges();

      const expectedTotal = mockCar.pricePerDay * 5; // 150 * 5 = 750
      expect(expectedTotal).toBe(750);
    });
  });

  describe('Authentication and Booking', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should show login warning when user is not authenticated', (done) => {
      mockDatabaseService.currentUser = signal(null);

      component.confirmBooking();

      expect(component.showLoginWarning()).toBe(true);

      setTimeout(() => {
        expect(component.showLoginWarning()).toBe(false);
        done();
      }, 3100);
    });

    it('should successfully create booking when user is authenticated', () => {
      mockDatabaseService.addBooking.and.returnValue(true);
      component.days = 3;
      component.serviceType = 'pickup';
      component.usageType = 'leisure';

      component.confirmBooking();

      expect(mockDatabaseService.addBooking).toHaveBeenCalledWith(
        mockCar.id,
        jasmine.any(String), // startTimeISO
        3,
        jasmine.stringMatching(/^SR-[A-Z0-9]{6}$/), // transaction ID pattern
        jasmine.objectContaining({
          service: 'pickup',
          usage: 'leisure',
          address: 'N/A',
          color: 'Pearl White'
        })
      );
      expect(component.showSuccess()).toBe(true);
    });

    it('should not show success modal if booking fails', () => {
      mockDatabaseService.addBooking.and.returnValue(false);

      component.confirmBooking();

      expect(component.showSuccess()).toBe(false);
    });
  });

  describe('Service Type and Delivery', () => {
    it('should handle delivery service type and capture address', () => {
      component.serviceType = 'delivery';
      component.deliveryAddress = '123 Main St, Manila';

      expect(component.serviceType).toBe('delivery');
      expect(component.deliveryAddress).toBe('123 Main St, Manila');
    });

    it('should default to pickup service type', () => {
      expect(component.serviceType).toBe('pickup');
    });

    it('should use N/A for address when pickup is selected', () => {
      mockDatabaseService.addBooking.and.returnValue(true);
      component.ngOnInit();
      component.serviceType = 'pickup';
      component.deliveryAddress = '';

      component.confirmBooking();

      expect(mockDatabaseService.addBooking).toHaveBeenCalledWith(
        jasmine.any(Number),
        jasmine.any(String),
        jasmine.any(Number),
        jasmine.any(String),
        jasmine.objectContaining({
          address: 'N/A'
        })
      );
    });
  });

  describe('Success Modal and Navigation', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should display success modal with transaction details', () => {
      mockDatabaseService.addBooking.and.returnValue(true);
      component.days = 2;

      component.confirmBooking();

      expect(component.showSuccess()).toBe(true);
      expect(component.transactionId).toMatch(/^SR-[A-Z0-9]{6}$/);
      expect(component.endDate).toBeTruthy();
    });

    it('should navigate to home after closing success modal', () => {
      component.showSuccess.set(true);

      component.closeAndExit();

      expect(component.showSuccess()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('Image Selection', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should compute active image based on selected color variant', () => {
      component.selectedColor.set(mockCar.variants[1]); // Midnight Black

      expect(component.activeImage()).toBe('https://example.com/black.jpg');
    });

    it('should fallback to car imageUrl when no variant is selected', () => {
      component.selectedColor.set(null);

      expect(component.activeImage()).toBe(mockCar.imageUrl);
    });

    it('should update active image when color is changed', () => {
      const whiteVariant = mockCar.variants[0];
      const blackVariant = mockCar.variants[1];

      component.selectedColor.set(whiteVariant);
      expect(component.activeImage()).toBe(whiteVariant.image);

      component.selectedColor.set(blackVariant);
      expect(component.activeImage()).toBe(blackVariant.image);
    });
  });
});
