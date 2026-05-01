import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatabaseService, Car, CarVariant } from '../../services/database';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './booking.html', // Moved template to separate file for cleaner code
  styles: [`
    .full-click-input::-webkit-calendar-picker-indicator {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      width: 100%; height: 100%; margin: 0; padding: 0; cursor: pointer; opacity: 0;
    }
    .animate-overlay { animation: overlayIn 0.5s ease-out forwards; }
    .animate-pop { animation: literalPop 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
    @keyframes overlayIn { 0% { backdrop-filter: blur(0px); background: transparent; } 100% { backdrop-filter: blur(24px); background: rgba(0,0,0,0.7); } }
    @keyframes literalPop { 0% { transform: scale(0.4) translateY(40px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
  `]
})
export class Booking implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public db = inject(DatabaseService);

  // --- MANILA TIME LOCK ---
  private getManilaNow(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  }

  selectedStartTime = signal<string>(this.formatDateForInput(this.getManilaNow()));
  minDateTime = this.formatDateForInput(this.getManilaNow());

  // --- SIGNALS & STATE ---
  car = signal<Car | undefined>(undefined);
  selectedColor = signal<CarVariant | null>(null);
  days = 1;
  serviceType = 'pickup';
  deliveryAddress = '';
  showSuccess = signal(false);
  showLoginWarning = signal(false);
  transactionId = '';
  endDate = '';

  activeImage = computed(() => this.selectedColor()?.image || this.car()?.imageUrl);

  // Filters bookings from the DB for THIS specific car
  carBookings = computed(() => {
    const id = this.car()?.id;
    return this.db.bookings()
      .filter(b => 
        b.carId === id && 
        b.status !== 'terminated' && // 👈 EXCLUDE TERMINATED
        b.status !== 'cancelled'     // 👈 EXCLUDE CANCELLED
      )
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  });

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const foundCar = this.db.cars().find(c => c.id === id);
    if (foundCar) {
      this.car.set(foundCar);
      if (foundCar.variants?.length > 0) this.selectedColor.set(foundCar.variants[0]);
    }
  }

  // --- FORMATTERS ---
  formatDateForInput(date: Date): string {
    return date.toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T').substring(0, 16);
  }

  formatDisplayDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-US', { 
      timeZone: 'Asia/Manila', 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  }

  updateDays(amount: number) {
    const nextValue = this.days + amount;
    if (nextValue >= 1 && nextValue <= 30) this.days = nextValue;
  }

  // Add this new signal to your class
  // --- SIGNALS & STATE ---
  hasOptimized = signal(false); // Tracks if they clicked the "Optimize" button

  // Refined Advisory Logic: Only shows if time is < 2h away AND they haven't optimized yet
  showLogisticsAdvisory = computed(() => {
    if (this.hasOptimized()) return false; 

    const selected = new Date(this.selectedStartTime()).getTime();
    const now = this.getManilaNow().getTime();
    const prepWindowMs = 2 * 60 * 60 * 1000;
    
    return (selected - now) < prepWindowMs;
  });

  // The "Optimize" Action
  adjustToReadyTime() {
    const readyTime = new Date(this.getManilaNow().getTime() + (2 * 60 * 60 * 1000));
    this.selectedStartTime.set(this.formatDateForInput(readyTime));
    this.hasOptimized.set(true); 
  }

  // Handler for manual date changes
  onDateManualChange(newValue: string) {
    this.selectedStartTime.set(newValue);
    this.hasOptimized.set(false); // Reset so advisory can reappear if they go back to "Now"
  }

  // --- THE CORE LOGIC ---
  // --- THE CORE LOGIC ---
  confirmBooking() {
    // 1. Identity Check
    if (!this.db.currentUser()) {
      this.showLoginWarning.set(true);
      setTimeout(() => this.showLoginWarning.set(false), 3000);
      return;
    }

    // 🛡️ 2. Policy Guard: Double-check conflict before proceeding
    if (this.isDateConflict()) {
      this.db.showPopup("Unavailable", "This unit is reserved or in maintenance.", "error");
      return;
    }

    const currentCar = this.car();
    if (!currentCar) return;

    // 3. Generate Transaction Data
    this.transactionId = 'SR-' + Math.random().toString(36).toUpperCase().substring(2, 8);
    const start = new Date(this.selectedStartTime());
    
    // Calculate return date based on days selected
    const returnDate = new Date(start.getTime() + (this.days * 24 * 60 * 60 * 1000));

    this.endDate = returnDate.toLocaleString('en-US', { 
      timeZone: 'Asia/Manila',
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const bookingPayload = {
      service: this.serviceType,
      address: this.deliveryAddress || 'N/A',
      color: this.selectedColor()?.name || 'Standard'
    };

    // 4. Send to DatabaseService
    this.db.addBooking(
      currentCar.id, 
      start.toISOString(),
      this.days, 
      this.transactionId, 
      bookingPayload,
      () => this.showSuccess.set(true) 
    );
  }

  // Inside your Booking class

  // 🛠️ THE POLICY CHECKER
  isDateConflict = computed(() => {
    const startStr = this.selectedStartTime();
    if (!startStr || !this.car()) return false;

    const requestedStart = new Date(startStr).getTime();
    const bufferMs = 2 * 60 * 60 * 1000;
    const requestedEnd = requestedStart + (this.days * 24 * 60 * 60 * 1000) + bufferMs;
    
    const MAINTENANCE_BUFFER = 24 * 60 * 60 * 1000; 

    // This will now only check against VALID, ACTIVE bookings
    return this.carBookings().some(b => {
      const existingStart = new Date(b.startDate).getTime();
      const existingEnd = new Date(b.endDate).getTime();
      
      return (requestedStart < (existingEnd + MAINTENANCE_BUFFER)) && 
            (requestedEnd > (existingStart - MAINTENANCE_BUFFER));
    });
  });

  // Add this to your Booking class
  isImmediateBooking = computed(() => {
    const selected = new Date(this.selectedStartTime()).getTime();
    const now = this.getManilaNow().getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    
    // Returns true if the selected time is less than 2 hours from now
    return (selected - now) < twoHoursMs;
  });

  // Inside your Booking class

  // 🛠️ SMART SUGGESTION LOGIC
  nextAvailableSlot = computed(() => {
    const carId = this.car()?.id;
    if (!carId) return null;

    // Get all bookings for this car, sorted by end date
    const bookings = this.db.bookings()
      .filter(b => b.carId === carId)
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

    if (bookings.length === 0) return null;

    // Get the latest booking's end time + 24h buffer
    const lastBooking = bookings[bookings.length - 1];
    const lastEnd = new Date(lastBooking.endDate).getTime();
    const buffer = 24 * 60 * 60 * 1000;
    
    const suggestedTime = new Date(lastEnd + buffer);
    
    // Return formatted for the datetime-local input
    return this.formatDateForInput(suggestedTime);
  });

  // Helper to apply the suggestion
  applySuggestedTime() {
    const suggestion = this.nextAvailableSlot();
    if (suggestion) {
      this.selectedStartTime.set(suggestion);
    }
  }

  // Inside your Booking Component
  myActiveBookings = computed(() => this.db.bookings()
    .filter(b => 
      (b.userId === this.db.currentUser()?.id) && 
      (b.status === 'active' || b.status === 'pending_termination')
    )
  );

  closeAndExit() {
    this.showSuccess.set(false);
    this.router.navigate(['/']);
  }
}