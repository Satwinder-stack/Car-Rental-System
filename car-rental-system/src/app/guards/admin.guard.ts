import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { DatabaseService } from '../services/database';

export const adminGuard: CanActivateFn = () => {
  const db = inject(DatabaseService);
  const router = inject(Router);
  
  // Check the Signal first
  let user = db.currentUser();

  // FIX: If Signal is null, check LocalStorage directly as a backup 
  // (This prevents the "Refresh-Kickout" bug)
  if (!user) {
    const saved = localStorage.getItem('sr_user');
    if (saved) {
      user = JSON.parse(saved);
    }
  }

  // Identity Verification
  if (user && user.role === 'admin') {
    return true; 
  }

  console.warn('SYSTEM_ALERT: Unauthorized Admin Access Attempted.');
  
  // If they are a customer, send to home. If guest, send to auth.
  const target = user ? '/' : '/auth';
  router.navigate([target]);
  return false;
};