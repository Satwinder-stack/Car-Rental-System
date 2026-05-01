import { Injectable, signal, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

// --- INTERFACES ---

export interface User {
  id?: string;
  email: string;
  password?: string;
  role: 'admin' | 'customer';
  name: string;
  balance: number;
  phone?: string; 
}

export interface Car {
  id: number;
  brand: string;
  model: string;
  pricePerDay: number;
  type: string;
  imageUrl: string;
  isAvailable: boolean; 
  transmission: string;
  fuelType: string;
  engine: string;
  variants: CarVariant[];
}

export interface CarVariant {
  name: string;
  hex: string;
  image: string;
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:3000/api';

  // --- SIGNALS (STATE MANAGEMENT) ---
  cars = signal<Car[]>([]);
  bookings = signal<any[]>([]);
  
  // 🚀 FIX: Declare the missing signal here
  completedBookings = signal<any[]>([]); 
  
  currentUser = signal<User | null>(this.getStoredUser());

  public popupData = signal<{
    active: boolean;
    title?: string;
    message?: string;
    type?: 'confirm' | 'info' | 'error' | 'success';
    onConfirm?: () => void;
  }>({ active: false });

  public modal = signal<{
    show: boolean, 
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'confirm' | 'input',
    action?: (data?: any) => void
  }>({
    show: false, title: '', message: '', type: 'success'
  });

  constructor() {
    this.syncWithDatabase();

    effect(() => {
      const user = this.currentUser();
      if (user) {
        localStorage.setItem('sr_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('sr_user');
      }
    });
  }

  // --- DATA SYNCHRONIZATION ---

  syncWithDatabase() {
    // 1. Fetch Cars
    this.http.get<Car[]>(`${this.apiUrl}/cars`).subscribe({
      next: (data) => this.cars.set(data),
      error: () => console.warn("Backend offline.")
    });

    // 2. Fetch ALL Bookings
    this.http.get<any[]>(`${this.apiUrl}/bookings`).subscribe({
      next: (data: any[]) => {
        this.bookings.set(data); // 🟢 Holds everything for migration
        this.getArchivedHistory().subscribe(); 
        console.log(`✅ Sync: ${data.length} total active/terminated logs.`);
      },
      error: (err: any) => console.error("Could not load bookings.", err)
    });

    // 3. 💰 WALLET UPDATE (Keep your existing code for this)
    const user = this.currentUser();
    if (user) {
      const userId = user.id || (user as any)._id;
      this.http.get<User>(`${this.apiUrl}/users/${userId}`).subscribe({
        next: (freshUser) => {
          const mappedUser: User = {
            ...freshUser,
            id: (freshUser as any)._id || freshUser.id
          };
          this.currentUser.set(mappedUser);
          localStorage.setItem('sr_user', JSON.stringify(mappedUser));
        },
        error: (err) => console.warn("Wallet refresh failed. Ensure GET /api/users/:id exists.")
      });
    }
  }

  // --- AUTHENTICATION ---

  private handleUserAuth(user: any) {
    const mappedUser: User = {
      ...user,
      id: user._id || user.id,
      role: user.role?.toLowerCase() || 'customer'
    };
    
    this.currentUser.set(mappedUser);
    // Change this to match getStoredUser()
    localStorage.setItem('sr_user', JSON.stringify(mappedUser)); 

    if (mappedUser.role === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/']);
    }
  }

  register(email: string, pass: string, name: string, phone: string) { 
    const payload = { email, password: pass, name, phone };

    this.http.post<any>(`${this.apiUrl}/auth/register`, payload).subscribe({
      next: (user) => this.handleUserAuth(user),
      error: (err) => {
        this.modal.set({ 
          show: true, 
          title: "SYSTEM_REJECTION", 
          message: err.error?.message || "Internal Database Conflict",
          type: "error" 
        });
      }
    });
  }

  login(email: string, pass: string) {
    this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password: pass }).subscribe({
      next: (user) => this.handleUserAuth(user),
      error: () => this.showPopup("Login Failed", "Invalid credentials.", "error")
    });
  }

  logout() {
    this.currentUser.set(null);
    this.router.navigate(['/auth']);
  }

  // --- BOOKING OPERATIONS ---

  addBooking(carId: number, startDate: string, days: number, transactionId: string, details: any, onSuccess?: () => void) {
    const car = this.cars().find(c => c.id === carId);
    const user = this.currentUser();

    if (!user || !car) {
      this.showPopup("Error", "User or Car data missing.", "error");
      return;
    }

    const totalCost = car.pricePerDay * days;
    const userBalance = user.balance || 0;

    if (userBalance < totalCost) {
      const amountNeeded = totalCost - userBalance;
      this.showPopup(
        "Insufficient Balance", 
        `Kindly deposit $${amountNeeded.toLocaleString()} more to your wallet to complete this reservation.`, 
        "error"
      );
      return;
    }

    const bookingData = {
      id: transactionId,
      userId: user.id || (user as any)._id, 
      carId: car.id,
      carName: `${car.brand} ${car.model}`,
      user: user.email,
      startDate: startDate,
      endDate: new Date(new Date(startDate).getTime() + (days * 86400000)).toISOString(),
      total: totalCost,
      ...details 
    };

    this.http.post<any>(`${this.apiUrl}/bookings`, bookingData).subscribe({
      next: (response) => {
        // 🚀 CRITICAL FIX: Update the local user signal with the response from the backend
        if (response.user) {
          // Map the _id from MongoDB to our local 'id' property
          const updatedUser = { 
            ...response.user, 
            id: response.user._id || response.user.id 
          };
          
          // Update the signal (This immediately updates the UI wallet)
          this.currentUser.set(updatedUser);
          
          // Save to localStorage so it stays updated after a refresh
          localStorage.setItem('sr_user', JSON.stringify(updatedUser));
        }

        this.syncWithDatabase(); // Refresh the list of bookings
        
        this.showPopup("Success", `Booking Confirmed! $${totalCost.toLocaleString()} deducted.`, "success");
        
        if (onSuccess) onSuccess();
      },
      error: (err) => this.showPopup("Booking Failed", err.error.message || "Error", "error")
    });
  }

  // Inside your DatabaseService
  // Inside database.service.ts

  massMigrate() {
    return this.http.post(`${this.apiUrl}/completed_bookings/mass-migrate`, {}).subscribe({
      next: (res: any) => {
        this.syncWithDatabase(); // 🔄 Refresh everything
        this.showPopup("Master_Sync_Complete", `Successfully moved ${res.count} records.`, "success");
      },
      error: (err) => {
        const msg = err.error?.message || "Migration failed.";
        this.showPopup("Migration_Error", msg, "error");
      }
    });
  }

  requestTermination(data: { 
    bookingId: string, 
    reason: string, 
    returnMethod: string, 
    pickupAddress: string, 
    timeSlot: string, 
    estimatedRefund: number 
  }) {
    const payload = {
      ...data,
      status: 'pending_termination',
      requestDate: new Date()
    };

    this.http.post(`${this.apiUrl}/bookings/${data.bookingId}/terminate`, payload).subscribe({
      next: () => {
        this.bookings.update(bs => bs.map(b => 
          (b.id === data.bookingId || b._id === data.bookingId) ? { ...b, status: 'pending_termination' } : b
        ));
        this.showPopup("Success", "Return request sent. Awaiting Admin Approval.", "success");
      },
      error: (err) => {
        console.error("Termination Error:", err);
        this.showPopup("System_Error", "Could not reach the server.", "error");
      }
    });
  }

  terminateBooking(bookingId: string, refund: number) {
  // 🚀 Ensure we send the refund to the backend so it's saved in the DB
    const url = `${this.apiUrl}/bookings/${bookingId}/confirm`;

    this.http.post<any>(url, { refund }).subscribe({
      next: (res) => {
        // Refresh both lists so the new 'refund' value is fetched from the server
        this.syncWithDatabase(); 
        this.showPopup("Success", "Transaction Processed", "success");
      },
      error: (err) => this.showPopup("Error", "Sync Failed", "error")
    });
  }

  toggleAvailability(carId: number) {
    const car = this.cars().find(c => c.id === carId);
    if (!car) return;

    this.http.patch(`${this.apiUrl}/cars/${carId}`, { isAvailable: !car.isAvailable }).subscribe({
      next: () => this.syncWithDatabase(),
      error: () => this.showPopup("Error", "Could not update car status.", "error")
    });
  }

  resetSystem() {
    this.showPopup("Factory Reset?", "This will clear local sessions and reload the app. Confirm?", "confirm", () => {
      localStorage.clear();
      window.location.reload();
    });
  }

  showPopup(title: string, message: string, type: any = 'info', onConfirm?: () => void) {
    this.popupData.set({
      active: true,
      title,
      message,
      type,
      onConfirm
    });
  }

  closePopup() {
    this.popupData.set({ active: false });
    this.modal.set({ ...this.modal(), show: false });
  }

  private getStoredUser(): User | null {
    const saved = localStorage.getItem('sr_user');
    return saved ? JSON.parse(saved) : null;
  }

  getArchivedHistory() {
    return this.http.get<any[]>(`${this.apiUrl}/completed_bookings`).pipe(
      tap((data: any[]) => {
        this.completedBookings.set(data);
        console.log("✅ Final Container History Synced:", data);
      })
    );
  }

  // Inside DatabaseService class
  public archiveSingleBooking(bookingId: any, refund: number) {
    return this.http.post(`${this.apiUrl}/completed_bookings/archive`, { 
      bookingId, 
      refund 
    });
  }

  // This sends the return request to your backend (NodeJS/PHP)
  updateBookingStatus(data: any) {
    // Replace this URL with your actual API endpoint for updating bookings
    return this.http.post(`${this.apiUrl}/update-booking-status`, data);
  }
}

