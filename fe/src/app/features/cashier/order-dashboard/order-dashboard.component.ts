import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../core/services/dashboard.service';
import { OrderDetail, OrderStatus } from '../../../core/models/order.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-order-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-[calc(100vh-80px)] flex flex-col bg-surface-soft overflow-hidden">
      <!-- Dashboard Subheader Toolbar -->
      <div class="bg-canvas border-b border-hairline px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-rausch/10 text-rausch flex items-center justify-center text-lg">
            👨‍🍳
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="font-display-sm text-ink leading-tight">Cashier & Kitchen Live Board</h2>
              @if (dashboardService.isConnected()) {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  SSE Connected
                </span>
              } @else {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  Connecting...
                </span>
              }
            </div>
            <p class="text-xs text-muted mt-0.5">Real-time incoming paid orders from tables</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Table Search Filter -->
          <div class="relative">
            <input
              type="text"
              [(ngModel)]="tableFilter"
              placeholder="Filter Table (e.g. 04)..."
              class="h-9 px-3 text-xs rounded-sm border border-hairline focus:border-ink outline-none bg-canvas w-48 placeholder:text-muted"
            />
            @if (tableFilter) {
              <button
                type="button"
                (click)="tableFilter = ''"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
              >
                ✕
              </button>
            }
          </div>

          <button
            type="button"
            (click)="reload()"
            class="h-9 px-3 rounded-sm border border-hairline hover:border-ink text-xs font-medium text-ink bg-canvas transition"
          >
            Refresh ↺
          </button>
        </div>
      </div>

      <!-- 4-Column Kanban Board -->
      <div class="flex-1 p-6 overflow-x-auto grid grid-cols-1 md:grid-cols-4 gap-5 min-w-[1000px]">
        <!-- COLUMN 1: NEW ORDERS (Pending) -->
        <div class="flex flex-col bg-canvas rounded-md border border-hairline shadow-sm overflow-hidden">
          <div class="p-3.5 bg-amber-50/70 border-b border-hairline flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              <h3 class="font-title-sm font-bold text-ink">New Orders</h3>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
              {{ filterOrders(dashboardService.pendingOrders()).length }}
            </span>
          </div>

          <div class="flex-1 p-3 overflow-y-auto space-y-3">
            @for (order of filterOrders(dashboardService.pendingOrders()); track order.id) {
              <div
                class="p-4 rounded-md border transition-all duration-300 bg-canvas"
                [ngClass]="{
                  'border-rausch shadow-[0_0_15px_rgba(255,56,92,0.3)] ring-2 ring-rausch/30 animate-pulse': dashboardService.newOrderPulseId() === order.id,
                  'border-hairline shadow-sm hover:shadow-airbnb': dashboardService.newOrderPulseId() !== order.id
                }"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2.5 py-1 rounded-sm bg-ink text-white font-title-sm font-bold">
                    Table {{ order.table_number }}
                  </span>
                  <span class="text-xs text-muted font-medium truncate max-w-[120px]">#{{ order.id }}</span>
                </div>

                <!-- Items list -->
                <div class="divide-y divide-hairline-soft my-2">
                  @for (it of order.items; track it.id) {
                    <div class="py-1.5 text-xs text-body">
                      <div class="flex justify-between font-semibold text-ink">
                        <span>{{ it.quantity }}x {{ it.name || it.menu_item?.name || 'Dish' }}</span>
                      </div>
                      @if (it.note) {
                        <p class="text-[11px] text-rausch font-medium italic mt-0.5 bg-rausch/5 px-1.5 py-0.5 rounded-sm border border-rausch/10">
                          🌶️ {{ it.note }}
                        </p>
                      }
                    </div>
                  }
                </div>

                <div class="pt-2 border-t border-hairline flex items-center justify-between mt-2">
                  <span class="text-xs font-bold text-ink">
                    Rp {{ order.total_price.toLocaleString('id-ID') }}
                  </span>

                  <!-- Status button -->
                  <button
                    type="button"
                    (click)="advance(order.id, 'pending')"
                    class="px-3 py-1.5 rounded-sm bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                  >
                    <span>Start Cook</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="py-12 text-center text-xs text-muted">
                No new incoming orders
              </div>
            }
          </div>
        </div>

        <!-- COLUMN 2: PREPARING -->
        <div class="flex flex-col bg-canvas rounded-md border border-hairline shadow-sm overflow-hidden">
          <div class="p-3.5 bg-blue-50/70 border-b border-hairline flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <h3 class="font-title-sm font-bold text-ink">Preparing in Kitchen</h3>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold">
              {{ filterOrders(dashboardService.preparingOrders()).length }}
            </span>
          </div>

          <div class="flex-1 p-3 overflow-y-auto space-y-3">
            @for (order of filterOrders(dashboardService.preparingOrders()); track order.id) {
              <div class="p-4 rounded-md border border-hairline bg-canvas shadow-sm hover:shadow-airbnb transition">
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2.5 py-1 rounded-sm bg-blue-600 text-white font-title-sm font-bold">
                    Table {{ order.table_number }}
                  </span>
                  <span class="text-xs text-muted font-medium truncate max-w-[120px]">#{{ order.id }}</span>
                </div>

                <div class="divide-y divide-hairline-soft my-2">
                  @for (it of order.items; track it.id) {
                    <div class="py-1.5 text-xs text-body">
                      <div class="flex justify-between font-semibold text-ink">
                        <span>{{ it.quantity }}x {{ it.name || it.menu_item?.name || 'Dish' }}</span>
                      </div>
                      @if (it.note) {
                        <p class="text-[11px] text-rausch font-medium italic mt-0.5 bg-rausch/5 px-1.5 py-0.5 rounded-sm">
                          🌶️ {{ it.note }}
                        </p>
                      }
                    </div>
                  }
                </div>

                <div class="pt-2 border-t border-hairline flex items-center justify-between mt-2">
                  <span class="text-xs font-bold text-ink">
                    Rp {{ order.total_price.toLocaleString('id-ID') }}
                  </span>

                  <button
                    type="button"
                    (click)="advance(order.id, 'preparing')"
                    class="px-3 py-1.5 rounded-sm bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                  >
                    <span>Mark Ready</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="py-12 text-center text-xs text-muted">
                No tickets currently cooking
              </div>
            }
          </div>
        </div>

        <!-- COLUMN 3: READY FOR PICKUP -->
        <div class="flex flex-col bg-canvas rounded-md border border-hairline shadow-sm overflow-hidden">
          <div class="p-3.5 bg-emerald-50/70 border-b border-hairline flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 class="font-title-sm font-bold text-ink">Ready for Pickup</h3>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
              {{ filterOrders(dashboardService.readyOrders()).length }}
            </span>
          </div>

          <div class="flex-1 p-3 overflow-y-auto space-y-3">
            @for (order of filterOrders(dashboardService.readyOrders()); track order.id) {
              <div class="p-4 rounded-md border border-emerald-300 bg-emerald-50/30 shadow-sm hover:shadow-airbnb transition">
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2.5 py-1 rounded-sm bg-emerald-600 text-white font-title-sm font-bold">
                    Table {{ order.table_number }}
                  </span>
                  <span class="text-xs text-muted font-medium truncate max-w-[120px]">#{{ order.id }}</span>
                </div>

                <div class="divide-y divide-hairline-soft my-2">
                  @for (it of order.items; track it.id) {
                    <div class="py-1.5 text-xs text-body">
                      <span class="font-semibold text-ink">{{ it.quantity }}x {{ it.name || it.menu_item?.name || 'Dish' }}</span>
                    </div>
                  }
                </div>

                <div class="pt-2 border-t border-hairline flex items-center justify-between mt-2">
                  <span class="text-xs font-bold text-ink">
                    Rp {{ order.total_price.toLocaleString('id-ID') }}
                  </span>

                  <button
                    type="button"
                    (click)="advance(order.id, 'ready')"
                    class="px-3 py-1.5 rounded-sm bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                  >
                    <span>Complete Order</span>
                    <span>✓</span>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="py-12 text-center text-xs text-muted">
                No orders waiting at pickup counter
              </div>
            }
          </div>
        </div>

        <!-- COLUMN 4: COMPLETED -->
        <div class="flex flex-col bg-canvas rounded-md border border-hairline shadow-sm overflow-hidden">
          <div class="p-3.5 bg-surface-soft border-b border-hairline flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-muted"></span>
              <h3 class="font-title-sm font-bold text-ink">Completed</h3>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-surface-strong text-ink text-xs font-bold">
              {{ filterOrders(dashboardService.completedOrders()).length }}
            </span>
          </div>

          <div class="flex-1 p-3 overflow-y-auto space-y-3">
            @for (order of filterOrders(dashboardService.completedOrders()); track order.id) {
              <div class="p-3.5 rounded-md border border-hairline bg-surface-soft/40 opacity-75">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-title-sm font-bold text-ink">Table {{ order.table_number }}</span>
                  <span class="text-[10px] text-muted truncate max-w-[100px]">#{{ order.id }}</span>
                </div>
                <p class="text-xs text-muted">{{ order.items?.length || 0 }} dishes served</p>
                <div class="text-xs font-semibold text-ink mt-2">
                  Rp {{ order.total_price.toLocaleString('id-ID') }}
                </div>
              </div>
            } @empty {
              <div class="py-12 text-center text-xs text-muted">
                Completed orders will be logged here
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class OrderDashboardComponent implements OnInit, OnDestroy {
  readonly dashboardService = inject(DashboardService);
  private authService = inject(AuthService);

  tableFilter = '';

  ngOnInit(): void {
    this.dashboardService.loadOrders().subscribe({
      error: (err) => console.error('Dashboard load error', err)
    });
  }

  ngOnDestroy(): void {
    this.dashboardService.disconnectSSE();
  }

  reload(): void {
    this.dashboardService.loadOrders().subscribe();
  }

  filterOrders(list: OrderDetail[]): OrderDetail[] {
    if (!this.tableFilter.trim()) return list;
    const q = this.tableFilter.trim().toLowerCase();
    return list.filter(o => o.table_number.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
  }

  advance(orderId: string, currentStatus: OrderStatus): void {
    this.dashboardService.advanceStatus(orderId, currentStatus).subscribe();
  }
}
