import { Component, inject, computed, ChangeDetectorRef, NgZone, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../services/database';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';
import * as L from 'leaflet';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-zinc-50 p-8 lg:p-16 font-sans">
      <div class="max-w-7xl mx-auto">
        
        <header class="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 mb-2">Internal_System_v1.1.5_MASTER_SYNC</p>
            <h1 class="text-6xl font-black tracking-tighter italic text-zinc-900">Fleet_Control</h1>
          </div>
          
          <div class="flex flex-wrap gap-4">
            <button (click)="massMigrateToFinal()" 
                    class="px-8 py-4 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
              Master_Commit_To_Final
            </button>

            <button (click)="db.resetSystem()" 
                    class="px-8 py-4 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-rose-600 transition-all active:scale-95">
              Reset_Database_Logs
            </button>

            <button (click)="exitTerminal()" routerLink="/" 
                    class="px-8 py-4 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all">
              Exit_Terminal
            </button>
          </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div class="bg-white p-8 rounded-[2.5rem] border border-zinc-200">
            <span class="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total_Live_Bookings</span>
            <p class="text-4xl font-black italic mt-2">{{ db.bookings().length }}</p>
          </div>
          
          <div class="bg-white p-8 rounded-[2.5rem] border border-zinc-200">
            <span class="text-[9px] font-black uppercase tracking-widest text-rose-400 italic">Total_Refunds_Paid</span>
            <p class="text-4xl font-black italic mt-2 text-rose-500">- $ {{ totalRefunds().toLocaleString() }}</p>
          </div>

          <div class="bg-zinc-950 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-zinc-950/20">
            <span class="text-[9px] font-black uppercase tracking-widest text-zinc-500">Net_Profit_Liquid</span>
            <p class="text-4xl font-black italic mt-2 text-emerald-400">$ {{ netRevenue().toLocaleString() }}</p>
          </div>

          <div class="bg-white p-8 rounded-[2.5rem] border border-zinc-200">
            <span class="text-[9px] font-black uppercase tracking-widest text-zinc-400">Pending_Refunds</span>
            <p class="text-4xl font-black italic mt-2 text-amber-500">{{ pendingRefunds().length }}</p>
          </div>
        </div>

        <div class="mb-12 relative">
          <h2 class="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6 ml-4 italic">Live_Street_Telemetry_Global</h2>
          
          <div class="relative w-full h-[600px] rounded-[3rem] border-4 border-white shadow-2xl overflow-hidden bg-zinc-100">
            
            <div id="map" class="w-full h-full z-0"></div>

            <div class="absolute top-6 right-6 p-4 bg-black/80 backdrop-blur-md rounded-2xl border border-zinc-800 z-[10] pointer-events-none">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span class="text-[10px] font-black text-white uppercase italic tracking-widest">Signal: AES_256_ACTIVE</span>
              </div>
              <p class="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Region: Angeles_City_PH</p>
            </div>

            <button 
              (click)="toggleSimulation()"
              class="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/90 backdrop-blur-md border border-zinc-800 rounded-full text-white font-bold flex items-center gap-3 hover:bg-zinc-800 transition-all z-[10]">
              <div [class]="isPaused ? 'w-3 h-3 bg-red-500' : 'w-3 h-3 bg-emerald-500 animate-pulse'" class="rounded-full"></div>
              {{ isPaused ? 'RESUME SIMULATION' : 'PAUSE SIMULATION' }}
            </button>

            <div class="absolute bottom-6 left-6 p-4 bg-black/80 backdrop-blur-md rounded-2xl border border-zinc-800 z-[10] pointer-events-none">
              <p class="text-[9px] font-black text-emerald-500 uppercase tracking-tighter mb-1">Satellite_Uptime: 99.9%</p>
              <div class="flex gap-4">
                <p class="text-[7px] font-mono text-zinc-500">LAT: 15.1336</p>
                <p class="text-[7px] font-mono text-zinc-500">LNG: 120.5907</p>
              </div>
            </div>

          </div>
        </div>

        @if (pendingRefunds().length > 0) {
          <div class="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 class="text-[11px] font-black uppercase tracking-[0.3em] text-rose-500 mb-6 ml-4">Refund_Authorization_Queue_Required</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                @for (req of pendingRefunds(); track req.id) {
                  <div class="bg-white border-2 border-rose-100 rounded-[3rem] p-8 shadow-xl shadow-rose-100/20 hover:border-rose-500 transition-all relative">
                    <div class="flex justify-between items-start mb-6">
                      <div>
                        <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{{ req.carName }}</p>
                        <p class="text-xl font-black text-zinc-900">#{{ req.id }}</p>
                        <p class="text-xs font-bold text-zinc-500 underline decoration-rose-200">{{ req.user }}</p>
                      </div>
                      <span class="bg-rose-100 text-rose-700 text-[8px] font-black px-3 py-1 rounded-full uppercase">Action_Required</span>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-6">
                      <div class="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p class="text-[8px] font-black text-zinc-400 uppercase mb-1 italic">Method</p>
                        <p class="text-[10px] font-black uppercase text-zinc-700">
                          {{ req.terminationRequest?.returnMethod === 'valet_pickup' ? 'Valet Pickup' : req.terminationRequest?.returnMethod?.replace('_', ' ') }}
                        </p>
                      </div>
                      <div class="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p class="text-[8px] font-black text-zinc-400 uppercase mb-1 italic">Reason</p>
                        <p class="text-[10px] font-black uppercase truncate text-zinc-700">{{ req.terminationRequest?.reason }}</p>
                      </div>
                    </div>

                    @if (req.terminationRequest?.returnMethod === 'company_pickup') {
                      <div class="mb-6 p-5 bg-zinc-900 rounded-2xl text-white border-l-4 border-emerald-500">
                        <p class="text-[8px] font-black text-zinc-500 uppercase mb-2 italic">📍 Dispatch_Location</p>
                        <p class="text-xs font-black uppercase mb-1 tracking-tight">{{ req.terminationRequest?.pickupAddress }}</p>
                        <p class="text-[10px] font-bold text-emerald-400 uppercase">Window: {{ req.terminationRequest?.timeSlot }}</p>
                      </div>
                    }

                    <div class="flex items-center justify-between pt-6 border-t border-zinc-100">
                      <div>
                        <p class="text-[8px] font-black text-zinc-400 uppercase">Authorize_Refund</p>
                        <p class="text-3xl font-black text-emerald-600 italic">
                          $ {{ (req.terminationRequest?.estimatedRefund || req.estimatedRefund || 0).toLocaleString() }}
                        </p>
                      </div>
                      <button type="button" (click)="approveRefund(req)" 
                              class="bg-zinc-950 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all active:scale-95 cursor-pointer">
                        Confirm_Deposit
                      </button>
                    </div>
                  </div>
                }
            </div>
          </div>
        }

        <div class="mb-8">
          <div class="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] border border-zinc-200 shadow-sm">
            <div class="relative w-full md:w-96">
              <span class="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">🔍</span>
              <input type="text" 
                    (input)="onSearch($event)"
                    placeholder="Search client, unit, or booking ID..." 
                    class="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[11px] font-bold uppercase tracking-tight focus:outline-none focus:border-zinc-900 transition-all">
            </div>

            <div class="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
              @for (type of ['all', 'active', 'pending_termination', 'terminated']; track type) {
                <button (click)="setFilter(type)"
                        [class]="activeFilter() === type ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'"
                        class="px-6 py-3 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap">
                  {{ type.replace('_', ' ') }}
                </button>
              }
            </div>
          </div>
        </div>

        <div class="bg-white rounded-[3rem] border border-zinc-200 overflow-hidden shadow-xl shadow-zinc-200/50 mb-16">
          <div class="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <h2 class="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500">
              Full_History_Transaction_Logs ({{ filteredTransactions().length }})
            </h2>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
                  <th class="px-8 py-6">ID / Client</th>
                  <th class="px-8 py-6">Unit_Config</th>
                  <th class="px-8 py-6">Status</th>
                  <th class="px-8 py-6">Duration</th>
                  <th class="px-8 py-6 text-right">Settlement & Actions</th> </tr>
              </thead>
              <tbody class="divide-y divide-zinc-50">
                @for (b of filteredTransactions(); track b.id || b._id) {
                  <tr class="hover:bg-zinc-50/80 transition-colors group">
                    <td class="px-8 py-8">
                      <p class="text-[10px] font-black text-emerald-500 mb-1">#{{ b.id || b.bookingId }}</p>
                      <p class="font-bold text-zinc-900">{{ b.user }}</p>
                    </td>
                    <td class="px-8 py-8">
                      <p class="font-black text-zinc-900 uppercase tracking-tighter italic text-lg">{{ b.carName }}</p>
                      <span class="px-2 py-0.5 bg-zinc-100 rounded text-[9px] font-black text-zinc-600 uppercase">{{ b.color || 'Standard' }}</span>
                    </td>
                    <td class="px-8 py-8">
                      <span [class]="getStatusClass(b.status)" 
                            class="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                        {{ b.status.replace('_', ' ') }}
                      </span>
                    </td>
                    <td class="px-8 py-8">
                      <p class="text-[10px] font-bold text-zinc-900">{{ b.startDate | date:'shortDate' }}</p>
                      <p class="text-[10px] font-bold text-zinc-400">to {{ b.endDate | date:'shortDate' }}</p>
                    </td>
                    <td class="px-8 py-8 text-right">
                      <p class="font-black italic text-2xl" [class.text-rose-500]="b.refund">
                        $ {{ ((b.total || 0) - (b.refund || 0)).toLocaleString() }}
                      </p>
                      
                      @if (b.refund) {
                        <p class="text-[8px] font-black text-rose-400 uppercase italic mb-4">Refunded: $ {{b.refund.toLocaleString()}}</p>
                      }

                      @if (b.status === 'terminated') {
                        <button (click)="finalizeToArchive(b)"
                                class="mt-2 px-4 py-2 bg-zinc-900 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-500 hover:text-black transition-all active:scale-95 shadow-lg shadow-zinc-950/20">
                          Archive_To_Final_Container
                        </button>
                      } @else if (b.status === 'archived_permanent') {
                        <span class="text-[8px] font-black text-emerald-500 uppercase tracking-widest italic">✓ Locked_In_Storage</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div>
            <h2 class="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-8 ml-4">Fleet_Inventory_Database_Status</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              @for (car of db.cars(); track car.id) {
                <div class="bg-white p-6 rounded-[2.5rem] border border-zinc-200 flex items-center justify-between group hover:border-zinc-400 transition-all">
                  <div>
                    <p class="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">{{ car.brand }}</p>
                    <p class="font-black italic text-zinc-900 leading-tight">{{ car.model }}</p>
                  </div>
                  <button (click)="db.toggleAvailability(car.id)"
                          [class]="car.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'"
                          class="w-12 h-6 rounded-full relative transition-all duration-500 shadow-inner cursor-pointer">
                    <div [class]="car.isAvailable ? 'translate-x-6' : 'translate-x-1'" 
                          class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-md"></div>
                  </button>
                </div>
              }
            </div>
        </div>

      </div>
    </div>
  `
})
export class AdminPanel implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  constructor(public db: DatabaseService) {}

  completedBookings = signal<any[]>([]); 

  ngOnInit() {
    // 1. Automatic refresh logic (Keeps your session clean)
    const hasReloaded = sessionStorage.getItem('admin_session_active');
    if (!hasReloaded) {
      sessionStorage.setItem('admin_session_active', 'true');
      window.location.reload(); 
      return;
    }

    // 2. Start the Data Sync
    this.db.syncWithDatabase();

    // 3. Load History and START THE GPS ENGINE
    this.db.getArchivedHistory().subscribe({
      next: (data: any) => {
        this.completedBookings.set(data);
        
        // 🚀 THE TRIGGER: Start moving the dots once the component is ready
        // We use a tiny timeout to ensure the 'db.cars()' signal is populated
        setTimeout(() => {
          this.initGPS();
        }, 500);
      }, 
      error: (err: any) => console.error("Archive fetch failed", err)
    });
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  searchQuery = signal<string>('');
  activeFilter = signal<string>('all'); // 'all', 'active', 'terminated', 'pending_termination'


  // Helper to change filters
  setFilter(status: string) {
    this.activeFilter.set(status);
  }

  // Helper for search input
  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  exitTerminal() {
    sessionStorage.removeItem('admin_session_active');
  }

  finalizeToArchive(booking: any) {
    const bId = booking.bookingId || booking.id || booking._id;
    const refundAmt = booking.refund || 0;

    this.db.showPopup(
      "Data_Migration_Required",
      `Move record #${bId} to the Final Container?`,
      'confirm',
      () => {
        // 🚀 USE THE NEW SERVICE METHOD HERE
        this.db.archiveSingleBooking(bId, refundAmt).subscribe({
          next: (res: any) => {
            this.db.syncWithDatabase(); // 🔄 Refresh the table
            this.db.showPopup("Success", "Record moved to Static History.", "success");
          },
          error: (err: any) => {
            console.error("Archive Error:", err);
            this.db.showPopup("Error", "Could not archive. Check server console.", "error");
          }
        });
      }
    );
  }

  // ✅ MERGED TABLE LOGIC: Shows everything in one list
  /**
 * ✅ ADMIN TRANSACTION FILTER:
 * Updated to include 'terminated' so they appear in the logs.
 */
  // Look for this in your admin-panel.ts
  // In src/app/components/admin-panel/admin-panel.ts

  // 1. First, ensure the merge includes EVERYTHING
  allTransactions = computed(() => {
    const live = this.db.bookings(); 
    const archived = this.db.completedBookings(); 

    // We merge them and ensure we aren't missing any records
    return [...live, ...archived].sort((a, b) => 
      new Date(b.startDate || b.requestDate).getTime() - new Date(a.startDate || a.requestDate).getTime()
    );
  });

  filteredTransactions = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const filter = this.activeFilter();
    
    // 🚩 IMPORTANT: Combine both signals so the filter has data to look at
    let list = [...this.db.bookings(), ...this.db.completedBookings()];

    // 1. Status Filter Logic
    if (filter !== 'all') {
      list = list.filter(b => {
        // If the user clicks 'Terminated', show 'terminated', 'completed', or 'archived'
        if (filter === 'terminated') {
          return b.status === 'terminated' || b.status === 'completed' || b.status === 'archived';
        }
        return b.status === filter;
      });
    }

    // 2. Search Logic (with safety checks)
    if (query) {
      list = list.filter(b => 
        b.user?.toLowerCase().includes(query) || 
        b.carName?.toLowerCase().includes(query) || 
        (b.id || b._id)?.toString().toLowerCase().includes(query)
      );
    }

    return list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  });


  // 1. Total Original Money (990 in your case)
  // 1. Original Gross amount before any refunds
  grossRevenue = computed(() => {
    const all = [...this.db.bookings(), ...this.db.completedBookings()];
    return all.reduce((acc, b) => acc + (Number(b.total) || 0), 0);
  });

  // 2. Total money sent back to clients
  totalRefunds = computed(() => {
    const all = [...this.db.bookings(), ...this.db.completedBookings()];
    return all.reduce((acc, b) => {
      // Check for refund in the main object or the nested request
      const refundVal = b.refund || b.terminationRequest?.estimatedRefund || 0;
      return acc + (Number(refundVal) || 0);
    }, 0);
  });

  // 3. THE FIX: Net Profit (What the company actually keeps)
  netRevenue = computed(() => {
    const gross = this.grossRevenue();
    const refunds = this.totalRefunds();
    
    // 1100 (Gross) - 900 (Refunds) = 200 (Net)
    return gross - refunds;
  });

  pendingRefunds = computed(() => this.db.bookings().filter(b => b.status === 'pending_termination'));

  getStatusClass(status: string) {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'pending_termination': return 'bg-amber-100 text-amber-700';
      case 'terminated': return 'bg-zinc-100 text-zinc-400';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  }

  massMigrateToFinal() {
    // 🔍 DEBUG: Let's see what the system actually sees
    const allBookings = this.db.bookings();
    console.log("Current System Data:", allBookings);

    const readyCount = allBookings.filter((b: any) => {
      const status = String(b.status || '').toLowerCase().trim();
      return status === 'terminated' || status === 'completed';
    }).length;

    if (readyCount === 0) {
      this.db.showPopup("System_Idle", "No 'terminated' logs found. Refreshing...", "info");
      this.db.syncWithDatabase();
      return;
    }

    this.db.showPopup(
      "Final_Database_Commit",
      `Move ${readyCount} records to the Permanent Static Container?`,
      'confirm',
      () => this.db.massMigrate()
    );
  }

  approveRefund(req: any) {
    const refundAmount = req.terminationRequest?.estimatedRefund || req.estimatedRefund || 0;
    const targetId = req.id || req._id;

    this.zone.run(() => {
      this.db.showPopup(
        "Authorize_Financial_Transfer",
        `Confirming $${refundAmount.toLocaleString()} deposit. Proceed?`,
        'confirm',
        () => {
          this.db.terminateBooking(targetId, refundAmount);

          // 🚀 CRITICAL: Update local state so 'netRevenue()' updates immediately
          this.db.bookings.update(all => 
            all.map(b => (b.id === targetId || b._id === targetId) 
              ? { ...b, status: 'terminated', refund: refundAmount } 
              : b
            )
          );

          this.cdr.detectChanges();
        }
      );
    });
  }

  gpsFleet = signal<any[]>([]);
  readonly OFFICE_COORDS = { x: 50, y: 50 };
  map!: L.Map;
  markers: Map<string, L.Marker> = new Map();












  private disabledGrids: number[] = [
    1,2,4,7,10,11,12,13,14,16,17,19,20,22,23,25,
    26,27,28,30,31,33,34,36,37,39,40,42,43,45,46,48,49,
    51,54,55,57,59,60,62,66,68,69,72,75,
    76,78,79,81,82,85,86,88,92,94,95,96,97,98,100,
    102,103,105,106,108,109,111,112,114,119,120,121,122,123,124,125,
    126,129,130,132,133,136,137,138,142,143,146,148,149,150,
    151,154,156,157,158,160,162,163,164,165,166,167,172,174,175,
    177,178,180,181,182,184,187,188,189,190,191,192,193,194,195,196,197,198,199,200,
    201,202,203,204,206,209,212,214,215,217,219,220,221,223,224,225,
    226,227,228,229,230,231,232,233,236,237,240241,242,243,246,249,250,
    252,253,255,256,257,259,260,261,263,266,267,268,270,272,273,275,
    276,279,281,282,283,285,286,287,289,292,294,297,299,
    301,302,304,305,307,308,311,315,316,318,320,321,323,324,325,
    326,327,328,329,330,331,334,335,336,337,339,340,341,342,344,345,346,347,347,349,350,
    351,352,353,355,358,359,360,361,363,366,368,369,370,371,372,373,374,375,
    376,378,380,384,385,386,387,390,392,393,395,396,397,398,400,
    401,402,405,406,407,410,411,412,414,416,417,418,419,422,423,424,
    427,429,430,431,432,433,434,435,437,438,439,440,441,442,443,444,446,447,448,449,450,
    451,452,455,456,457,458,459,460,463,465,466,467,469,470,471,472,473,474,475,
    478,479,480,481,482,485,486,487,488,489,491,493,494,495,497,498,499,500,
    501,502,503,504,507,508,509,510,511,512,513,514,514,517,518,519,521,523,524,525,
    526,527,529,530,532,533,534,535,536,537,538,540,541,542,543,545,546,547,549,550,
    551,553,555,556,557,558,559,560,561,562,563,564,565,566,567,569,570,571,573,574,575,
    576,577,578,580,581,582,583,584,585,587,588,589,590,591,592,594,595,597,598,599,600,
    601,602,603,604,606,607,608,609,611,612,613,614,616,617,618,620,621,621,622,623,624,625
  ]; 

  private carPath1: number[] = [
    312,313,338,364,389,413,436,483,506,505,454,428,403,379,354,303,277,251,179,155,107,83,58,32,56,80,104,128,127,101,77,53,29,5,
    6,32,8,9,35,61,87,113,139,216,241,265,291,317,343,319,295,271,247,222,245,293,317,343,394,420,445,468,492,516,515,539
  ];

  private carPath2: number[] = [
    312,313,338,364,389,413,436,483,506,552
  ];

  private carPath3: number[] = [
    312,313,338,310,309,284,258,205,179,153,127,101
  ];

  private carPath4: number[] = [
    312,313,338,364,365,317,293,269,245,173
  ];

  private carPath5: number[] = [
    312,313,338,310,333,356,403,377
  ];

  private carPath6: number[] = [
    312,313,338,389,413,464,490,516,593,619
  ];

  private selectedPathMap: Map<string, number[]> = new Map();
  private currentPathIndex: Map<string, number> = new Map();
  private waitingCars: Map<string, number> = new Map();
  public isPaused: boolean = false;

  private navGrid: any[] = [];
  
  toggleSimulation() {
    this.isPaused = !this.isPaused;
  }

  initGPS() {
    if (this.map) {
      this.map.remove();
      this.markers.clear();
      this.navGrid = [];
      this.selectedPathMap.clear();
      this.currentPathIndex.clear();
      this.waitingCars.clear();
    }

    const HQ_COORDS: [number, number] = [15.1336, 120.5907];
    
    this.map = L.map('map', { zoomControl: false, attributionControl: false }).setView(HQ_COORDS, 17);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(this.map);

    this.generateNavGrid(HQ_COORDS, 25, 25, 0.0003);

    this.zone.runOutsideAngular(() => {
      interval(1000).subscribe(() => {
        // 1. If paused, we stop movement but keep tooltips interactive
        if (this.isPaused) return; 

        const activeIcon = L.divIcon({
          className: 'active-marker', 
          html: `<div class="relative flex items-center justify-center w-6 h-6">
                  <div class="absolute w-full h-full bg-emerald-500 rounded-full opacity-30 animate-ping"></div>
                  <div class="relative w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const idleIcon = L.divIcon({
          className: 'idle-marker', 
          html: `<div class="w-2 h-2 bg-zinc-400 border-2 border-white rounded-full"></div>`,
          iconSize: [8, 8],
          iconAnchor: [4, 4]
        });

        const allCars = this.db.cars();
        const activeBookings = this.db.bookings();

        allCars.forEach((car: any) => {
          const carId = car.id || car._id;
          
          const booking = activeBookings.find(b => 
            (b.carId === carId || b.carName === car.model) && 
            (b.status === 'active' || b.status === 'occupied')
          );
          
          const isBooked = car.isAvailable === false || car.isAvailable === 'false' || !!booking;

          if (!this.markers.has(carId)) {
            const newMarker = L.marker(HQ_COORDS, { icon: idleIcon }).addTo(this.map);
            this.markers.set(carId, newMarker);
          }
          const marker = this.markers.get(carId)!;

          if (isBooked) {
            // --- UPDATED TOOLTIP LOGIC ---
            // We re-bind the tooltip often to ensure it has the latest booking data
            if (booking) {
              // Format the dates because MongoDB stores them as ISO strings
              const start = new Date(booking.startDate).toLocaleDateString();
              const end = new Date(booking.endDate).toLocaleDateString();
              const startTime = new Date(booking.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endTime = new Date(booking.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              const tooltipContent = `
                <div class="p-3 bg-black/95 backdrop-blur-md text-white rounded-xl border border-zinc-800 shadow-2xl min-w-[220px]">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-emerald-400">${booking.carName || car.model}</span>
                  </div>
                  
                  <div class="space-y-1.5 text-[11px] font-medium text-zinc-300">
                    <p><span class="text-zinc-500 uppercase text-[9px] mr-1">Booking ID:</span> ${booking.id}</p>
                    <p><span class="text-zinc-500 uppercase text-[9px] mr-1">Email:</span> ${booking.user}</p>
                    <p><span class="text-zinc-500 uppercase text-[9px] mr-1">Service:</span> ${booking.service}</p>
                  </div>

                  <div class="mt-3 pt-2 border-t border-zinc-800/50">
                    <p class="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Rental Period</p>
                    <div class="flex justify-between items-center text-[10px] font-bold">
                      <span>${start}</span>
                      <span class="text-zinc-600 px-1">→</span>
                      <span>${end}</span>
                    </div>
                    <div class="text-[9px] text-zinc-400 mt-1 flex justify-between">
                      <span>Starts: ${startTime}</span>
                      <span>Ends: ${endTime}</span>
                    </div>
                  </div>
                  
                  <div class="mt-2 text-right">
                    <span class="text-[10px] text-emerald-500 font-bold">Total: $${booking.total}</span>
                  </div>
                </div>
              `;
              
              marker.bindTooltip(tooltipContent, { 
                sticky: true, 
                direction: 'top', 
                className: 'custom-car-tooltip',
                opacity: 1 
              });
            }

            if (!this.selectedPathMap.has(carId)) {
              const allPaths = [this.carPath1, this.carPath2, this.carPath3, this.carPath4, this.carPath5, this.carPath6];
              const randomPath = allPaths[Math.floor(Math.random() * allPaths.length)];
              this.selectedPathMap.set(carId, randomPath);
              this.currentPathIndex.set(carId, 0);
              this.waitingCars.delete(carId);
            }

            const activePath = this.selectedPathMap.get(carId)!;
            let pathIndex = this.currentPathIndex.get(carId) || 0;

            if (pathIndex >= activePath.length) {
              let waitTime = this.waitingCars.get(carId) || 0;
              if (waitTime < 3) {
                this.waitingCars.set(carId, waitTime + 1);
                marker.setIcon(activeIcon);
                return;
              } else {
                pathIndex = 0;
                this.currentPathIndex.set(carId, pathIndex);
                this.waitingCars.delete(carId);
              }
            }

            const nextGridNumber = activePath[pathIndex];
            const targetGrid = this.navGrid.find(g => g.id === nextGridNumber.toString());

            if (targetGrid) {
              const center = targetGrid.rect.getBounds().getCenter();
              marker.setLatLng(center);
              this.currentPathIndex.set(carId, pathIndex + 1);
            }
            marker.setIcon(activeIcon);

          } else {
            marker.unbindTooltip(); // Remove details if car is idle
            this.currentPathIndex.delete(carId);
            this.selectedPathMap.delete(carId);
            this.waitingCars.delete(carId);
            marker.setLatLng(HQ_COORDS);
            marker.setIcon(idleIcon);
          }
        });
      });
    });
  }

  generateNavGrid(center: [number, number], rows: number, cols: number, size: number) {
    const startLat = center[0] - (rows * size) / 2;
    const startLng = center[1] - (cols * size) / 2;
    let counter = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lat = startLat + r * size;
        const lng = startLng + c * size;
        const bounds: L.LatLngBoundsExpression = [[lat, lng], [lat + size, lng + size]];
        
        const isInitiallyBlocked = this.disabledGrids.includes(counter);

        const rect = L.rectangle(bounds, {
          // color: isInitiallyBlocked ? "#ef4444" : "#10b981",
          color: isInitiallyBlocked ? "transparent" : "transparent",
          weight: 1,
          fillOpacity: isInitiallyBlocked ? 0.5 : 0.05,
          interactive: true
        }).addTo(this.map);

        // rect.bindTooltip(`#${counter}`, {
        //   permanent: true,
        //   direction: 'center',
        //   className: 'grid-label',
        //   opacity: 0.5
        // });

        const gridEntry = { rect, isWalkable: !isInitiallyBlocked, id: counter.toString() };

        // rect.on('click', () => {
        //   gridEntry.isWalkable = !gridEntry.isWalkable;
        //   rect.setStyle({
        //     fillColor: gridEntry.isWalkable ? "#10b981" : "#ef4444",
        //     fillOpacity: gridEntry.isWalkable ? 0.05 : 0.5,
        //     color: gridEntry.isWalkable ? "#10b981" : "#ef4444"
        //   });
        // });

        this.navGrid.push(gridEntry);
        counter++;
      }
    }
  }
}