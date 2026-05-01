import { Component, signal, ViewEncapsulation, inject, effect, computed } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  encapsulation: ViewEncapsulation.None
})
export class Auth {
  public db = inject(DatabaseService);
  private router = inject(Router);

  // UI State
  isLogin = signal(true);
  isAdminMode = signal(false); 
  
  // Form Models (Binding these directly to [(ngModel)])
  email = '';
  password = '';
  name = '';
  phone = '';

  constructor() {
    effect(() => {
      const user = this.db.currentUser();
      if (user) {
        this.redirectUser();
      }
    });
  }

  /**
   * IMMEDIATE VALIDATION LOGIC
   * This returns the error message for the UI to display above the input.
   */
  /**
 * IMMEDIATE VALIDATION LOGIC
 * Now restricted to Sign Up mode only.
 */
  getErrorMessage(field: string): string {
    // If we are in Login mode or Admin mode, do not show validation errors
    if (this.isLogin() || this.isAdminMode()) return '';

    if (field === 'email' && this.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(this.email) ? 'INVALID_EMAIL_PROTOCOL' : '';
    }

    if (field === 'phone' && this.phone) {
      const phoneRegex = /^\d{10,11}$/;
      return !phoneRegex.test(this.phone) ? 'CONTACT_NUMBER_10-11_DIGITS' : '';
    }

    if (field === 'password' && this.password) {
      return this.password.length < 8 ? 'SECURITY_BREACH:TOO_SHORT' : '';
    }

    return '';
  }

  /**
   * Validates if the entire form is ready for submission
   */
  isFormInvalid(): boolean {
    if (this.isLogin()) {
      return !this.email || !this.password || !!this.getErrorMessage('email') || !!this.getErrorMessage('password');
    } else {
      return !this.email || !this.password || !this.name || !this.phone || 
             !!this.getErrorMessage('email') || !!this.getErrorMessage('password') || !!this.getErrorMessage('phone');
    }
  }

  toggleAdmin() {
    this.isAdminMode.update(v => !v);
    this.isLogin.set(true); 
    
    if (this.isAdminMode()) {
      this.email = 'admin@swiftrent.com';
    } else {
      this.email = '';
      this.name = '';
      this.phone = '';
      this.password = '';
    }
  }

  handleAuth() {
    if (this.isFormInvalid()) return; // Extra safety check

    if (this.isLogin()) {
      this.db.login(this.email, this.password);
    } else {
      this.db.register(this.email, this.password, this.name, this.phone);
    }
  }

  private redirectUser() {
    const user = this.db.currentUser();
    if (user?.role === 'admin') {
      this.router.navigate(['/admin']); 
    } else {
      this.router.navigate(['/']);
    }
  }
}