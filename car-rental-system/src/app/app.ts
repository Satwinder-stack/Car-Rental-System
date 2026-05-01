import { Component, inject, signal, OnDestroy, OnInit, effect, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DatabaseService } from './services/database';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    @if (db.popupData().active) {
      <div class="fixed inset-0 z-[10000] flex items-center justify-center p-6 sm:p-0">
        <div class="absolute inset-0 bg-zinc-950/60 backdrop-blur-md animate-in fade-in duration-300"></div>
        
        <div class="relative w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-300">
          <div class="mb-8">
            <p class="text-[9px] font-black text-rose-500 uppercase tracking-[0.4em] mb-3 italic">
              System_Authorization_Required
            </p>
            <h2 class="text-4xl font-black italic tracking-tighter text-zinc-900 uppercase leading-none">
              {{ db.popupData().title?.replace('_', ' ') }}
            </h2>
            <p class="text-sm font-bold text-zinc-500 mt-6 leading-relaxed">
              {{ db.popupData().message }}
            </p>
          </div>

          <div class="flex flex-col gap-3">
            <button (click)="confirmPopup()" 
                    class="w-full bg-zinc-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all active:scale-95">
              Confirm_Operation
            </button>
            <button (click)="closePopup()" 
                    class="w-full bg-zinc-100 text-zinc-400 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95">
              Decline_Request
            </button>
          </div>
        </div>
      </div>
    }

    <header class="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-zinc-100">
      <nav class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-3 group cursor-pointer" routerLink="/">
            <div class="w-10 h-10 bg-black rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6">
              <span class="text-white font-black text-sm italic tracking-tighter">KR</span>
            </div>
            <span class="text-2xl font-black tracking-tighter uppercase">KARL RENTAL</span>
          </div>

          <div class="hidden lg:block border-l border-zinc-100 pl-6">
            <p class="text-[7px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-1">System_Time (PHT)</p>
            <p class="text-[10px] font-black font-mono tracking-tighter text-zinc-800">
              {{ manilaTime() }}
            </p>
          </div>
        </div>

        <div class="hidden md:flex items-center gap-8">
          <a routerLink="/" 
            routerLinkActive="text-black" 
            [routerLinkActiveOptions]="{exact: true}"
            class="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
            The_Fleet
          </a>

          @if (db.currentUser()?.role === 'admin') {
            <a routerLink="/admin" 
              routerLinkActive="text-black" 
              class="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
              Admin_Dashboard
            </a>
          }
        </div>

        <div class="flex items-center gap-6">
          @if (db.currentUser()) {
            @if (db.currentUser()?.role === 'customer') {
              <div class="flex items-center gap-4 bg-zinc-50 p-1.5 pr-4 rounded-2xl border border-zinc-100">
                <div class="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-zinc-100">
                  <p class="text-[7px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Wallet</p>
                  <p class="text-[11px] font-black text-emerald-600 leading-none">
                    $ {{ db.currentUser()?.balance?.toLocaleString() }}
                  </p>
                </div>
                
                <button routerLink="/profile" class="flex items-center gap-2 group">
                  <div class="w-8 h-8 rounded-lg bg-black flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                    <span class="text-[10px]">👤</span>
                  </div>
                  <div class="text-left hidden lg:block">
                    <p class="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Member</p>
                    <p class="text-[10px] font-black uppercase tracking-tight leading-none group-hover:text-emerald-600 transition-colors">
                      {{ db.currentUser()?.name }}
                    </p>
                  </div>
                </button>
              </div>
            } @else {
              <div class="text-right hidden sm:block">
                <p class="text-[8px] font-black text-zinc-300 uppercase tracking-widest">Operator</p>
                <p class="text-[11px] font-black uppercase tracking-tight">{{ db.currentUser()?.name }}</p>
              </div>
            }
            
            <button (click)="logout()" 
                    class="border-2 border-zinc-100 text-zinc-400 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-rose-100 hover:text-rose-600 transition-all active:scale-95">
              Sign_Out
            </button>
          } @else {
            <div class="flex items-center gap-6">
              <span class="hidden lg:block text-[9px] font-black text-zinc-300 uppercase tracking-[0.2em]">
                Identify_to_Access_Fleet
              </span>
              <button routerLink="/auth" 
                      class="bg-black text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 hover:shadow-lg hover:shadow-black/10 active:scale-95 transition-all">
                Sign_In
              </button>
            </div>
          }
        </div>
      </nav>
    </header>

    <main class="min-h-screen bg-white">
      <router-outlet></router-outlet>
    </main>

    <footer class="py-12 border-t border-zinc-50 text-center">
      <p class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-900">
        © 2026 Karl Rental. Built with Angular. 
      </p>
    </footer>
  `
})
export class App implements OnInit, OnDestroy {
  public db = inject(DatabaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  manilaTime = signal<string>('');
  private clockInterval: any;

  constructor() {
    // 💡 THE CRITICAL FIX: Watch for popup changes globally
    effect(() => {
      if (this.db.popupData().active) {
        console.log("🔔 ROOT DETECTED POPUP REQUEST");
        this.cdr.detectChanges(); // Force the overlay to show immediately
      }
    });
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    });

    this.updateTime();
    this.clockInterval = setInterval(() => this.updateTime(), 1000);
  }

  updateTime() {
    const now = new Date();
    this.manilaTime.set(
      now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour12: true,
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }) + ' PHT'
    );
  }

  // Helper functions for the Popup buttons
  confirmPopup() {
    const callback = this.db.popupData().onConfirm;
    if (callback) callback();
    this.closePopup();
  }

  closePopup() {
    this.db.popupData.set({ active: false });
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  logout() {
    this.db.logout();
    this.router.navigate(['/auth']);
  }
}