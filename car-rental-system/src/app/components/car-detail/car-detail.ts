import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { DatabaseService, Car } from '../../services/database';

@Component({
  selector: 'app-car-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './car-detail.html'
})
export class CarDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public db = inject(DatabaseService); // Changed to public to access in HTML
  
  // Signal to hold the specific car data
  car = signal<Car | undefined>(undefined);

  // ✨ Optimization: Check if this car is already booked by others
  isReservedByOthers = computed(() => {
    const currentCar = this.car();
    if (!currentCar) return false;
    return this.db.bookings().some(b => b.carId === currentCar.id);
  });

  ngOnInit() {
    // 1. Get the ID from the URL (/car/4)
    const id = Number(this.route.snapshot.paramMap.get('id'));

    // 2. Attempt to find the car in the local Signal state
    const foundCar = this.db.cars().find(c => c.id === id);

    if (foundCar) {
      this.car.set(foundCar);
    } else {
      // 3. Fallback: If not found (e.g., on page refresh), 
      // the DatabaseService's syncWithDatabase() will eventually fill the cars() signal.
      // We can use an effect or a small timeout, but for OJT, 
      // redirecting if it truly doesn't exist is safer.
      setTimeout(() => {
        const retryFound = this.db.cars().find(c => c.id === id);
        if (retryFound) {
          this.car.set(retryFound);
        } else if (this.db.cars().length > 0) {
          // If cars are loaded but THIS ID isn't there, it's a 404
          this.router.navigate(['/']);
        }
      }, 500); 
    }
  }

  // Helper for UI badges
  getEngineStatus() {
    return this.car()?.isAvailable ? 'SYSTEM_READY' : 'IN_USE';
  }
}