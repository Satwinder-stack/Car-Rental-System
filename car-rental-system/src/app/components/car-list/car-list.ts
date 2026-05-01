import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-car-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './car-list.html',
  encapsulation: ViewEncapsulation.None
})
export class CarList {
  // 🛡️ Public access for the template to reach db.cars()
  public db = inject(DatabaseService); 
  
  // Reactive signal for the search input
  searchQuery = signal('');

  /**
   * ✨ THE FILTER ENGINE
   * This automatically re-runs whenever searchQuery() or db.cars() changes.
   * Perfect for real-time fleet searching.
   */
  filteredCars = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    
    // If no query, return the full fleet from MongoDB
    if (!query) return this.db.cars();

    return this.db.cars().filter(car => 
      car.model.toLowerCase().includes(query) || 
      car.brand.toLowerCase().includes(query) ||
      car.type?.toLowerCase().includes(query) // Added type search (e.g., "SUV")
    );
  });

  /**
   * Helper to show a "No results" state in the UI
   */
  hasResults = computed(() => this.filteredCars().length > 0);
}