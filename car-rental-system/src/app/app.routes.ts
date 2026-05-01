import { Routes } from '@angular/router';
import { Auth } from './components/auth/auth';
import { CarList } from './components/car-list/car-list';
import { CarDetail } from './components/car-detail/car-detail';
import { Booking } from './components/booking/booking';
import { AdminPanel } from './components/admin-panel/admin-panel';
import { adminGuard } from './guards/admin.guard';
import { Profile } from './components/profile/profile';

export const routes: Routes = [
  { path: 'auth', component: Auth },
  { path: '', component: CarList },
  { path: 'profile', component: Profile }, // ✨ Add this
  { path: 'car/:id', component: CarDetail },
  { path: 'booking/:id', component: Booking },
  
  // ✅ ONLY ONE ADMIN ROUTE - AND IT MUST HAVE THE GUARD
  { 
    path: 'admin', 
    component: AdminPanel, 
    canActivate: [adminGuard] 
  },
  
  { path: '**', redirectTo: '' } 
];