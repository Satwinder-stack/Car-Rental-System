import { TestBed } from '@angular/core/testing';
import { DatabaseService, User } from './database';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let localStorageMock: { [key: string]: string };
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};

    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return localStorageMock[key] || null;
    });

    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete localStorageMock[key];
    });

    // Create spies
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post', 'patch']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Default mock responses for constructor's syncWithDatabase
    httpClientSpy.get.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        DatabaseService,
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });
    
    service = TestBed.inject(DatabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Mass Migration Tests
  describe('Mass Migration', () => {
    it('should successfully migrate records and display success message with count', () => {
      const mockResponse = { count: 15, message: 'Migration successful' };
      spyOn(console, 'log');
      spyOn(service, 'showPopup');
      spyOn(service, 'syncWithDatabase');

      httpClientSpy.post.and.returnValue(of(mockResponse));

      service.massMigrate();

      expect(httpClientSpy.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/completed_bookings/mass-migrate',
        {}
      );
      expect(console.log).toHaveBeenCalledWith('🚀 Attempting Mass Migration to Port 3000...');
      expect(console.log).toHaveBeenCalledWith('✅ Migration Server Response:', mockResponse);
      expect(service.syncWithDatabase).toHaveBeenCalled();
      expect(service.showPopup).toHaveBeenCalledWith('Success', 'Migrated 15 records.', 'success');
    });

    it('should handle migration failure when server is unreachable', () => {
      const mockError = { status: 0, statusText: 'Unknown Error' };
      spyOn(console, 'log');
      spyOn(console, 'error');
      spyOn(service, 'showPopup');

      httpClientSpy.post.and.returnValue(throwError(() => mockError));

      service.massMigrate();

      expect(console.log).toHaveBeenCalledWith('🚀 Attempting Mass Migration to Port 3000...');
      expect(console.error).toHaveBeenCalledWith(
        '❌ Migration Failed. Check if Node.js is running on 3000:',
        mockError
      );
      expect(service.showPopup).toHaveBeenCalledWith(
        'Error',
        'Migration failed. Server unreachable on port 3000.',
        'error'
      );
    });

    it('should call syncWithDatabase after successful migration', () => {
      const mockResponse = { count: 5 };
      spyOn(service, 'syncWithDatabase');

      httpClientSpy.post.and.returnValue(of(mockResponse));

      service.massMigrate();

      expect(service.syncWithDatabase).toHaveBeenCalledTimes(1);
    });

    it('should log appropriate console messages during migration process', () => {
      const mockResponse = { count: 10 };
      spyOn(console, 'log');

      httpClientSpy.post.and.returnValue(of(mockResponse));

      service.massMigrate();

      expect(console.log).toHaveBeenCalledWith('🚀 Attempting Mass Migration to Port 3000...');
      expect(console.log).toHaveBeenCalledWith('✅ Migration Server Response:', mockResponse);
    });

    it('should handle server errors with proper error popup', () => {
      const mockError = { 
        status: 500, 
        statusText: 'Internal Server Error',
        error: { message: 'Database connection failed' }
      };
      spyOn(console, 'error');
      spyOn(service, 'showPopup');

      httpClientSpy.post.and.returnValue(throwError(() => mockError));

      service.massMigrate();

      expect(console.error).toHaveBeenCalledWith(
        '❌ Migration Failed. Check if Node.js is running on 3000:',
        mockError
      );
      expect(service.showPopup).toHaveBeenCalledWith(
        'Error',
        'Migration failed. Server unreachable on port 3000.',
        'error'
      );
    });
  });

  // Authentication Tests
  describe('Authentication', () => {
    it('should successfully login with valid credentials', () => {
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer',
        balance: 1000
      };

      httpClientSpy.post.and.returnValue(of(mockUser));

      service.login('test@example.com', 'password123');

      expect(httpClientSpy.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        { email: 'test@example.com', password: 'password123' }
      );
      expect(service.currentUser()?.email).toBe('test@example.com');
      expect(service.currentUser()?.role).toBe('customer');
    });

    it('should handle login failure with invalid credentials', () => {
      spyOn(service, 'showPopup');

      httpClientSpy.post.and.returnValue(
        throwError(() => ({ error: { message: 'Invalid credentials' } }))
      );

      service.login('wrong@example.com', 'wrongpass');

      expect(service.showPopup).toHaveBeenCalledWith('Login Failed', 'Invalid credentials.', 'error');
      expect(service.currentUser()).toBeNull();
    });

    it('should logout and clear user session', () => {
      service.logout();

      expect(service.currentUser()).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('sr_user');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth']);
    });
  });

  // Booking Tests
  describe('Bookings', () => {
    beforeEach(() => {
      // Set up a logged-in user with sufficient balance
      const mockUser: User = {
        id: '123',
        email: 'customer@example.com',
        name: 'Test Customer',
        role: 'customer',
        balance: 5000
      };
      service.currentUser.set(mockUser);

      // Set up a car
      service.cars.set([{
        id: 1,
        brand: 'Tesla',
        model: 'Model S',
        pricePerDay: 150,
        type: 'Sedan',
        imageUrl: 'test.jpg',
        isAvailable: true,
        transmission: 'Automatic',
        fuelType: 'Electric',
        engine: 'Dual Motor',
        variants: []
      }]);
    });

    it('should add a new booking with correct details', () => {
      const mockResponse = {
        booking: { id: 'booking123' },
        user: { _id: '123', balance: 4550 }
      };
      spyOn(service, 'showPopup');
      spyOn(service, 'syncWithDatabase');

      httpClientSpy.post.and.returnValue(of(mockResponse));

      service.addBooking(1, '2024-01-01', 3, 'txn123', {}, () => {});

      expect(httpClientSpy.post).toHaveBeenCalled();
      expect(service.showPopup).toHaveBeenCalledWith('Success', 'Booking Confirmed! $450 deducted.', 'success');
    });

    it('should reject booking with insufficient balance', () => {
      // Set user with low balance
      service.currentUser.set({
        id: '123',
        email: 'customer@example.com',
        name: 'Test Customer',
        role: 'customer',
        balance: 100
      });

      spyOn(service, 'showPopup');

      service.addBooking(1, '2024-01-01', 3, 'txn123', {});

      expect(service.showPopup).toHaveBeenCalledWith(
        'Insufficient Balance',
        jasmine.stringContaining('deposit'),
        'error'
      );
    });
  });

  // Car Availability Tests
  describe('Car Availability', () => {
    beforeEach(() => {
      service.cars.set([
        {
          id: 1,
          brand: 'Tesla',
          model: 'Model S',
          pricePerDay: 150,
          type: 'Sedan',
          imageUrl: 'test.jpg',
          isAvailable: true,
          transmission: 'Automatic',
          fuelType: 'Electric',
          engine: 'Dual Motor',
          variants: []
        }
      ]);
    });

    it('should toggle car availability status', () => {
      spyOn(service, 'syncWithDatabase');
      httpClientSpy.patch.and.returnValue(of({ success: true }));

      service.toggleAvailability(1);

      expect(httpClientSpy.patch).toHaveBeenCalledWith(
        'http://localhost:3000/api/cars/1',
        { isAvailable: false }
      );
      expect(service.syncWithDatabase).toHaveBeenCalled();
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    it('should handle missing user or car data when adding booking', () => {
      spyOn(service, 'showPopup');

      service.addBooking(999, '2024-01-01', 3, 'txn123', {});

      expect(service.showPopup).toHaveBeenCalledWith('Error', 'User or Car data missing.', 'error');
    });

    it('should handle empty localStorage gracefully', () => {
      localStorageMock = {};

      const newService = TestBed.inject(DatabaseService);

      expect(newService.currentUser()).toBeNull();
    });
  });
});
