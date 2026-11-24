import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrderTrackingService } from '../../core/services/order-tracking.service';
import { OrderHistoryService } from '../../core/services/order-history.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderStatus } from '../../core/models/order.model';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-8">
      @if (orderTrackingService.currentOrder(); as order) {
        <div class="bg-canvas rounded-md border border-hairline shadow-airbnb overflow-hidden animate-in fade-in">
          <!-- Top Status Banner -->
          <div
            class="p-6 border-b border-hairline transition-colors"
            [ngClass]="{
              'bg-emerald-50 border-emerald-200': orderTrackingService.currentStatus() === 'ready',
              'bg-surface-soft': orderTrackingService.currentStatus() !== 'ready'
            }"
          >
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider text-muted">Live Kitchen Status</span>
                <h2 class="font-display-md text-ink mt-0.5">
                  @switch (orderTrackingService.currentStatus()) {
                    @case ('pending') { Order Received 📋 }
                    @case ('preparing') { Preparing in Kitchen 🍳 }
                    @case ('ready') { Food Ready for Pickup! 🎉 }
                    @case ('completed') { Order Completed ✓ }
                  }
                </h2>
              </div>
              <div class="text-right">
                <span class="text-xs text-muted block">Order ID</span>
                <span class="font-title-sm font-bold text-ink truncate max-w-[150px] inline-block">#{{ order.id }}</span>
              </div>
            </div>

            <!-- SSE Live Pulse -->
            <div class="flex items-center justify-between mt-3 text-xs text-muted font-medium">
              <div class="flex items-center gap-2">
                <span
                  class="w-2.5 h-2.5 rounded-full"
                  [ngClass]="orderTrackingService.isConnected() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"
                ></span>
                <span>
                  {{ orderTrackingService.isConnected() ? 'Live Kitchen Stream Active (/sse)' : 'Connecting to Stream...' }}
                  • Table {{ order.table_number }}
                </span>
              </div>
              <a routerLink="/history" class="text-rausch hover:underline text-xs font-semibold">
                Semua Pesanan ↺
              </a>
            </div>
          </div>

          <!-- Step Progress Indicator -->
          <div class="p-8 border-b border-hairline">
            <div class="grid grid-cols-4 gap-2 relative">
              <!-- Stepper Connecting Line -->
              <div class="absolute top-4 left-6 right-6 h-0.5 bg-hairline -z-0">
                <div
                  class="h-full bg-rausch transition-all duration-500"
                  [style.width]="progressWidth()"
                ></div>
              </div>

              <!-- Step 1: Received -->
              <div class="flex flex-col items-center text-center relative z-10">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition shadow-sm mb-2"
                  [ngClass]="{
                    'bg-rausch text-white': isStepActive('pending'),
                    'bg-white border-2 border-hairline text-muted': !isStepActive('pending')
                  }"
                >
                  1
                </div>
                <span class="font-title-sm text-xs font-semibold" [ngClass]="isStepActive('pending') ? 'text-ink' : 'text-muted'">
                  Received
                </span>
                <span class="text-[10px] text-muted">Ticket placed</span>
              </div>

              <!-- Step 2: Preparing -->
              <div class="flex flex-col items-center text-center relative z-10">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition shadow-sm mb-2"
                  [ngClass]="{
                    'bg-rausch text-white': isStepActive('preparing'),
                    'bg-white border-2 border-hairline text-muted': !isStepActive('preparing')
                  }"
                >
                  2
                </div>
                <span class="font-title-sm text-xs font-semibold" [ngClass]="isStepActive('preparing') ? 'text-ink' : 'text-muted'">
                  Preparing
                </span>
                <span class="text-[10px] text-muted">In kitchen</span>
              </div>

              <!-- Step 3: Ready -->
              <div class="flex flex-col items-center text-center relative z-10">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition shadow-sm mb-2"
                  [ngClass]="{
                    'bg-emerald-600 text-white animate-bounce': orderTrackingService.currentStatus() === 'ready',
                    'bg-rausch text-white': isStepActive('ready') && orderTrackingService.currentStatus() !== 'ready',
                    'bg-white border-2 border-hairline text-muted': !isStepActive('ready')
                  }"
                >
                  3
                </div>
                <span class="font-title-sm text-xs font-semibold" [ngClass]="isStepActive('ready') ? 'text-ink' : 'text-muted'">
                  Ready
                </span>
                <span class="text-[10px] text-muted">Pick up</span>
              </div>

              <!-- Step 4: Completed -->
              <div class="flex flex-col items-center text-center relative z-10">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition shadow-sm mb-2"
                  [ngClass]="{
                    'bg-rausch text-white': isStepActive('completed'),
                    'bg-white border-2 border-hairline text-muted': !isStepActive('completed')
                  }"
                >
                  ✓
                </div>
                <span class="font-title-sm text-xs font-semibold" [ngClass]="isStepActive('completed') ? 'text-ink' : 'text-muted'">
                  Done
                </span>
                <span class="text-[10px] text-muted">Completed</span>
              </div>
            </div>

            <!-- Ready for pickup announcement callout -->
            @if (orderTrackingService.currentStatus() === 'ready') {
              <div class="mt-6 p-4 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-center animate-in zoom-in-95">
                <span class="text-2xl block mb-1">🛎️</span>
                <h4 class="font-title-md font-bold text-emerald-800">Your dishes are ready!</h4>
                <p class="font-body-sm text-emerald-700 mt-1">
                  Please show your table number to the kitchen pickup counter.
                </p>
              </div>
            }
          </div>

          <!-- Order Summary Details -->
          <div class="p-6">
            <h4 class="font-title-sm font-bold text-ink mb-3">Items in This Order</h4>
            <div class="divide-y divide-hairline">
              @for (item of order.items; track item.id) {
                <div class="py-3 flex justify-between items-start gap-4">
                  <div>
                    <span class="font-title-sm font-semibold text-ink">
                      {{ item.quantity }}x {{ item.name || item.menu_item?.name || 'Dish Item' }}
                    </span>
                    @if (item.note) {
                      <p class="text-xs text-rausch italic mt-0.5">Note: "{{ item.note }}"</p>
                    }
                  </div>
                  <span class="font-title-sm font-semibold text-ink shrink-0">
                    Rp {{ (item.unit_price * item.quantity).toLocaleString('id-ID') }}
                  </span>
                </div>
              }
            </div>

            <div class="pt-4 border-t border-hairline flex justify-between items-center mt-3">
              <span class="font-title-md text-muted">Total Paid</span>
              <span class="font-display-sm font-bold text-ink">
                Rp {{ order.total_price.toLocaleString('id-ID') }}
              </span>
            </div>
          </div>
        </div>
      } @else if (loading()) {
        <!-- LOADING SPINNER -->
        <div class="text-center py-20 bg-canvas rounded-md border border-hairline p-8 shadow-sm">
          <div class="animate-spin w-8 h-8 border-2 border-rausch border-t-transparent rounded-full mx-auto mb-3"></div>
          <h3 class="font-title-sm text-ink font-semibold">Memuat Status Pesanan...</h3>
          <p class="text-xs text-muted mt-1">Mencari pesanan aktif dan menyambungkan ke stream dapur (/sse)</p>
        </div>
      } @else if (errorMessage()) {
        <!-- ERROR STATE -->
        <div class="text-center py-16 bg-canvas rounded-md border border-hairline p-8 shadow-sm">
          <div class="w-14 h-14 rounded-full bg-rausch/10 text-rausch flex items-center justify-center text-2xl mx-auto mb-3">
            ⚠️
          </div>
          <h3 class="font-display-sm text-ink font-semibold">Gagal Memuat Pesanan</h3>
          <p class="font-body-sm text-muted mt-1 max-w-sm mx-auto">
            {{ errorMessage() }}
          </p>
          <div class="mt-5 flex justify-center gap-3">
            <button
              type="button"
              (click)="initOrderTracking()"
              class="px-4 py-2 rounded-sm bg-rausch hover:bg-rausch-active text-white text-xs font-semibold shadow-sm transition"
            >
              Coba Lagi ↺
            </button>
            <a
              routerLink="/history"
              class="px-4 py-2 rounded-sm border border-hairline hover:border-ink text-ink text-xs font-semibold transition"
            >
              Lihat Riwayat Pesanan
            </a>
          </div>
        </div>
      } @else if (noOrder()) {
        <!-- NO ORDER FOUND / EMPTY STATE -->
        <div class="text-center py-20 bg-canvas rounded-md border border-hairline p-8 shadow-sm">
          <div class="w-16 h-16 rounded-full bg-surface-soft text-3xl flex items-center justify-center mx-auto mb-3">
            🍽️
          </div>
          <h3 class="font-display-sm text-ink font-semibold">Belum Ada Pesanan Aktif</h3>
          <p class="font-body-sm text-muted mt-1 max-w-sm mx-auto">
            Anda belum memiliki pesanan yang sedang diproses. Silakan pilih menu dan lakukan pemesanan terlebih dahulu.
          </p>
          <div class="mt-6 flex justify-center gap-3">
            <a
              routerLink="/"
              class="px-6 py-2.5 rounded-sm bg-rausch hover:bg-rausch-active text-white text-xs font-semibold shadow-sm transition"
            >
              Buka Menu Makanan
            </a>
            <a
              routerLink="/history"
              class="px-6 py-2.5 rounded-sm border border-hairline hover:border-ink text-ink text-xs font-semibold transition"
            >
              Riwayat Pesanan
            </a>
          </div>
        </div>
      }
    </div>
  `
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  readonly orderTrackingService = inject(OrderTrackingService);
  private historyService = inject(OrderHistoryService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly loading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly noOrder = signal<boolean>(false);

  ngOnInit(): void {
    this.initOrderTracking();
  }

  ngOnDestroy(): void {
    this.orderTrackingService.disconnectSse();
  }

  initOrderTracking(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.noOrder.set(false);

    // 1. Check query parameter ?id=...
    const paramId = this.route.snapshot.queryParams['id'];
    if (paramId) {
      this.fetchOrder(paramId);
      return;
    }

    // 2. Check storage for last active order (sessionStorage and localStorage fallback)
    const storedOrderId = typeof window !== 'undefined'
      ? (sessionStorage.getItem('tableflow_active_order_id') || localStorage.getItem('tableflow_active_order_id'))
      : null;

    if (storedOrderId) {
      this.fetchOrder(storedOrderId);
      return;
    }

    // 3. Fallback: Query customer's order history to track the latest order
    if (this.authService.isLoggedIn()) {
      this.historyService.getOrders(1, 1).subscribe({
        next: (orders) => {
          if (orders && orders.length > 0) {
            const latestId = orders[0].id;
            this.fetchOrder(latestId);
          } else {
            this.loading.set(false);
            this.noOrder.set(true);
          }
        },
        error: (err) => {
          this.loading.set(false);
          if (err.status === 401) {
            this.errorMessage.set('Silakan login terlebih dahulu untuk melihat status pesanan Anda.');
          } else {
            this.noOrder.set(true);
          }
        }
      });
    } else {
      this.loading.set(false);
      this.errorMessage.set('Silakan login terlebih dahulu untuk melacak pesanan Anda.');
    }
  }

  private fetchOrder(orderId: string): void {
    this.orderTrackingService.loadOrder(orderId).subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.errorMessage.set(`Pesanan #${orderId} tidak ditemukan.`);
        } else if (err.status === 401 || err.status === 403) {
          this.errorMessage.set('Anda tidak memiliki otorisasi untuk mengakses pesanan ini.');
        } else {
          this.errorMessage.set(err.error?.message || 'Gagal memuat data pesanan dari server.');
        }
      }
    });
  }

  isStepActive(step: OrderStatus): boolean {
    const sequence: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed'];
    const currentIdx = sequence.indexOf(this.orderTrackingService.currentStatus());
    const stepIdx = sequence.indexOf(step);
    return currentIdx >= stepIdx;
  }

  progressWidth(): string {
    switch (this.orderTrackingService.currentStatus()) {
      case 'pending': return '15%';
      case 'preparing': return '48%';
      case 'ready': return '82%';
      case 'completed': return '100%';
      default: return '15%';
    }
  }
}

