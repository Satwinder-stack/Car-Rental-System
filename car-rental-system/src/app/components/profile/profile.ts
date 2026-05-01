import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { DatabaseService } from '../../services/database';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './profile.html'
})
export class Profile implements OnInit, OnDestroy {
  public db = inject(DatabaseService);
  public router = inject(Router);

  // UI & Form State
  isTerminating = signal(false); 
  selectedBooking = signal<any | null>(null); // Tracks which car is being returned
  
  returnForm = signal({
    method: 'office_dropoff',
    address: '',
    timeSlot: '08:00 AM - 10:00 AM',
    reason: 'Finished renting' // Set this as the new default
  });

  private currentTime = signal(this.getManilaTime());
  private timerInterval: any;

  ngOnInit() {
    this.db.syncWithDatabase();
    if (!this.db.currentUser()) {
      this.router.navigate(['/auth']);
    }

    this.timerInterval = setInterval(() => {
      this.currentTime.set(this.getManilaTime());
    }, 60000);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  // --- LOGIC HELPERS ---

  /**
   * Helper for HTML template to show/hide "Change of Mind"
   */
  canCancel(startDate: string): boolean {
    const start = new Date(startDate);
    return start > this.getManilaTime();
  }

  /**
   * ✅ ACTIVE RESERVATIONS:
   * Updated to filter out 'terminated' status so they disappear from the dashboard list.
   */
  // ONLY show what they are currently driving or about to drive
  userBookings = computed(() => {
    const user = this.db.currentUser();
    if (!user) return [];
    return this.db.bookings().filter(b => 
      (b.userId === user.id || b.user === user.email) &&
      (b.status === 'active' || b.status === 'pending_termination') // 👈 No 'terminated' here
    );
  });

  // Show everything for their records
  /**
 * ✅ UNIFIED TRANSACTION HISTORY:
 * Merges 'bookings' (Unflushed) and 'completed_bookings' (Flushed)
 */

  // --- Add to profile.ts ---
  // --- Updated profile.ts ---
  searchQuery = signal('');

  filteredHistory = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const allData = this.historyBookings();

    let filtered = allData;
    if (query) {
      filtered = allData.filter(b => {
        // Date Formatting for search (e.g., "March 2026")
        const dateString = new Date(b.startDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }).toLowerCase();

        return (
          b.carName?.toLowerCase().includes(query) || 
          b.id?.toLowerCase().includes(query) || 
          b._id?.toLowerCase().includes(query) ||
          b.status?.toLowerCase().includes(query) ||
          b.total?.toString().includes(query) || // Search by Amount
          dateString.includes(query)             // Search by Date string
        );
      });
    }

    // Active-First + Date Descending Sort
    return filtered.sort((a, b) => {
      const statusA = a.status === 'active' ? 0 : 1;
      const statusB = b.status === 'active' ? 0 : 1;
      if (statusA !== statusB) return statusA - statusB;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  });







  historyBookings = computed(() => {
    const user = this.db.currentUser();
    if (!user) return [];

    // 1. Get Unflushed Data (Current active/terminated but not moved)
    const unflushed = this.db.bookings().filter(b => 
      (b.userId === user.id || b.user === user.email)
    );

    // 2. Get Flushed Data (Archived history)
    // Assuming your DatabaseService has a signal/array for completed bookings
    const flushed = (this.db.completedBookings?.() || []).filter(b => 
      (b.userId === user.id || b.user === user.email)
    );

    // 3. Combine and Sort by Start Date (Descending - Newest First)
    return [...unflushed, ...flushed].sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  });


  confirmReturn() {
    const booking = this.selectedBooking();
    const form = this.returnForm();
    const isFuture = this.isFutureBooking(booking);
    
    // FIX: Change to valet_pickup
    const isPickup = form.method === 'valet_pickup'; 

    const databaseFriendlyMethod = form.method;
    const statusPrefix = isFuture ? 'CANCELLED: ' : 'RETURNED: ';
    const pickupTag = isPickup ? ' [VALET_PICKUP_FEE_APPLIED]' : '';
    const finalReason = statusPrefix + form.reason + pickupTag;

    const finalRefund = this.calculateEstimatedRefund(booking);

    let displayMessage = `Estimated Refund: $${finalRefund.toLocaleString()}.`;
    if (isPickup && !isFuture) {
      displayMessage += ` (Includes -$100 Valet Fee). Agent will meet you at ${form.address || 'HAU Terminal'}.`;
    }

    this.db.modal.set({
      show: true,
      title: isFuture ? "Cancellation Protocol" : "Authorize_Pickup",
      message: displayMessage,
      type: 'confirm',
      action: () => {
        this.db.requestTermination({
          bookingId: booking.id || booking._id,
          reason: finalReason, 
          returnMethod: databaseFriendlyMethod, 
          pickupAddress: isFuture ? 'N/A' : (isPickup ? form.address : 'Office Drop-off'),
          timeSlot: isPickup ? form.timeSlot : 'N/A',
          estimatedRefund: finalRefund 
        });

        setTimeout(() => {
          this.closeArchive();
          window.location.reload(); 
        }, 500);
      }
    });
  }

  // Update in profile.ts
  isRentalOverdue(booking: any): boolean {
    if (!booking || booking.status !== 'active') return false;
    const now = this.getManilaTime();
    return now >= new Date(booking.endDate);
  }

  refreshData() {
    // Replace this with whatever function you use to get bookings from the DB
    // this.getHistory(); or this.initData(); 
    window.location.reload(); // Temporary "nuclear" option to ensure data is fresh
  }

  viewRequestDetails(booking: any) {
    const request = booking.terminationRequest || {};
    
    this.selectedBooking.set({
      ...booking,
      id: booking.id || 'N/A',
      // Check every possible location for the refund
      refundAmount: request.refundAmount || request.estimatedRefund || 0,
      returnMethod: request.returnMethod || 'standard_return',
      
      // THE FIX: Try the request address, then the booking address, then a default.
      pickupAddress: request.address || request.pickupAddress || booking.address || 'HAU Campus',
      
      pickupWindow: request.timeSlot || '08:00 AM - 10:00 AM'
    });

    this.viewingPending.set(true);
    this.isTerminating.set(true);
  }

  requestTermination(booking: any) {
    this.selectedBooking.set(booking);
    this.viewingPending.set(false); // Make sure we aren't in "review" mode
    this.isTerminating.set(true);   // Open the modal
  }

  isFutureBooking(booking: any): boolean {
    if (!booking?.startDate) return false;
    
    // Use the Actual Handover Time if it exists in payload, otherwise the startDate
    const startTime = booking.payload?.actualHandoverTime 
      ? new Date(booking.payload.actualHandoverTime).getTime()
      : new Date(booking.startDate).getTime();
      
    const now = this.getManilaTime().getTime();
    
    return startTime > now;
  }

  submitReturnRequest() {
    const booking = this.selectedBooking();
    const requestData = {
      bookingId: booking.id || booking._id,
      status: 'pending_termination', // This triggers the Admin view
      terminationRequest: {
        returnMethod: this.returnForm().method,
        pickupAddress: this.returnForm().address,
        requestDate: new Date()
      }
    };

    this.db.updateBookingStatus(requestData).subscribe({
      next: () => {
        this.db.showPopup("Success", "Return request logged. Awaiting Admin confirmation.", "success");
        this.db.syncWithDatabase();
      }
    });
  }

  // Helper to update the signal when a button is clicked
  setReturnMethod(method: 'office_dropoff' | 'valet_pickup') {
    this.returnForm.update(current => ({
      ...current,
      method: method
    }));
  }

  

  // --- CALCULATIONS ---

  /**
 * ✅ UPDATED CALCULATION:
 * Subtracts $100 if 'company_pickup' is selected.
 */
  calculateEstimatedRefund(booking: any): number {
    const now = this.getManilaTime();
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);

    const totalMs = end.getTime() - start.getTime();
    const totalHours = Math.max(1, totalMs / (1000 * 60 * 60)); // Prevent divide by zero

    const remainingMs = end.getTime() - now.getTime();
    let remainingHours = remainingMs / (1000 * 60 * 60);

    if (remainingHours > totalHours) remainingHours = totalHours;
    if (remainingHours <= 0) return 0;

    const hourlyRate = (booking.total || 0) / totalHours;
    let estimatedRefund = Math.floor(remainingHours * hourlyRate);

    // FIX: Change to valet_pickup
    const isPickup = this.returnForm().method === 'valet_pickup';
    const isFuture = this.isFutureBooking(booking);

    if (isPickup && !isFuture) {
      estimatedRefund = Math.max(0, estimatedRefund - 100);
    }

    return estimatedRefund;
  }

  getNearestReturnDate(): Date {
    const now = this.getManilaTime();
    const scheduled = new Date(now);
    scheduled.setHours(12, 0, 0, 0);
    if (now.getHours() >= 10) scheduled.setDate(scheduled.getDate() + 1);
    return scheduled;
  }

  private getManilaTime(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  }

  private getDurationInDays(b: any): number {
    const diff = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  viewingPending = signal(false);

  // Update your close logic to reset this
  closeArchive() {
    this.isTerminating.set(false);
    this.selectedBooking.set(null);
    this.viewingPending.set(false);
  }

  handleLogout() {
    this.db.logout();
  }
}