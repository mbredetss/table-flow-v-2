import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { OrderHistoryService, ReorderCheckResult } from '../../core/services/order-history.service';
import { OrderDetail, OrderSummary } from '../../core/models/order.model';
import { MenuService } from '../../core/services/menu.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="font-display-md text-ink">My Past Orders</h2>
          <p class="font-body-sm text-muted mt-0.5">View your past receipts and reorder items directly.</p>
        </div>
        <a
          routerLink="/"
          class="px-4 py-2 rounded-full border border-hairline hover:border-ink text-xs font-semibold text-ink transition"
        >
          Explore Menu
        </a>
      </div>

      @if (loading()) {
        <div class="py-20 text-center bg-canvas rounded-md border border-hairline">
          <div class="animate-spin w-8 h-8 border-2 border-rausch border-t-transparent rounded-full mx-auto mb-3"></div>
          <p class="text-xs text-muted">Loading your past orders...</p>
        </div>
      } @else if (orders().length === 0) {
        <!-- Empty State -->
        <div class="py-20 text-center bg-canvas rounded-md border border-hairline">
          <div class="w-16 h-16 rounded-full bg-surface-soft text-2xl flex items-center justify-center mx-auto mb-3">
            📋
          </div>
          <h3 class="font-display-sm text-ink font-semibold">No orders yet</h3>
          <p class="font-body-sm text-muted mt-1 max-w-sm mx-auto">
            When you place orders at our tables, your past orders will appear here.
          </p>
          <a
            routerLink="/"
            class="inline-block mt-4 px-6 py-2.5 rounded-sm bg-rausch hover:bg-rausch-active text-white text-xs font-semibold shadow-sm transition"
          >
            Start Ordering
          </a>
        </div>
      } @else {
        <div class="space-y-4">
          @for (order of orders(); track order.id) {
            <div class="bg-canvas rounded-md border border-hairline p-5 shadow-sm hover:shadow-airbnb transition">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-title-md font-bold text-ink truncate max-w-[180px]">Order #{{ order.id }}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      [ngClass]="{
                        'bg-emerald-100 text-emerald-800': order.status === 'completed',
                        'bg-rausch/10 text-rausch': order.status === 'ready' || order.status === 'preparing',
                        'bg-surface-strong text-muted': order.status === 'pending'
                      }"
                    >
                      {{ order.status }}
                    </span>
                  </div>
                  <p class="text-xs text-muted mt-0.5">
                    {{ formatDate(order.created_at) }}
                  </p>
                </div>

                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <span class="text-xs text-muted block">Total Paid</span>
                    <span class="font-title-md font-bold text-ink">
                      Rp {{ order.total_price.toLocaleString('id-ID') }}
                    </span>
                  </div>

                  <!-- Reorder Button -->
                  <button
                    type="button"
                    [disabled]="reorderingId() === order.id"
                    (click)="initiateReorder(order.id)"
                    class="px-4 py-2 rounded-sm bg-rausch hover:bg-rausch-active text-white text-xs font-semibold transition shadow-sm disabled:opacity-50"
                  >
                    {{ reorderingId() === order.id ? 'Checking...' : 'Reorder ↺' }}
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Skipped Items Confirmation Modal -->
    @if (skippedModalData(); as check) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-in fade-in">
        <div class="bg-canvas w-full max-w-md rounded-md p-6 shadow-airbnb-modal relative">
          <div class="w-12 h-12 rounded-full bg-rausch/10 text-rausch flex items-center justify-center text-xl mx-auto mb-3">
            ⚠️
          </div>
          <h3 class="font-display-sm text-ink text-center">Some Items Are Unavailable</h3>
          <p class="font-body-sm text-muted mt-2 text-center">
            The following dishes from your past order are currently sold out:
          </p>

          <ul class="my-4 p-3 bg-surface-soft rounded-sm border border-hairline divide-y divide-hairline">
            @for (skipped of check.skippedItems; track skipped) {
              <li class="py-1.5 text-xs font-semibold text-rausch flex items-center gap-2">
                <span>✕</span>
                <span>{{ skipped }}</span>
              </li>
            }
          </ul>

          <p class="font-body-sm text-body text-center mb-5">
            Would you like to proceed with reordering the remaining available items?
          </p>

          <div class="flex gap-3">
            <button
              type="button"
              (click)="skippedModalData.set(null)"
              class="flex-1 h-11 rounded-sm border border-hairline hover:border-ink text-ink font-medium text-xs transition"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="confirmReorder(check)"
              class="flex-1 h-11 rounded-sm bg-rausch hover:bg-rausch-active text-white font-semibold text-xs transition shadow-sm"
            >
              Confirm & Add Available
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class OrderHistoryComponent implements OnInit {
  private historyService = inject(OrderHistoryService);
  private menuService = inject(MenuService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  readonly orders = signal<OrderSummary[]>([]);
  readonly loading = signal<boolean>(true);
  readonly reorderingId = signal<string | null>(null);
  readonly skippedModalData = signal<ReorderCheckResult | null>(null);

  ngOnInit(): void {
    this.historyService.getOrders().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'Recent';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  initiateReorder(orderId: string): void {
    this.reorderingId.set(orderId);

    // Fetch full order detail and live menu concurrently
    this.historyService.getOrderDetail(orderId).subscribe({
      next: (orderDetail) => {
        this.menuService.getItems().subscribe({
          next: (liveItems) => {
            this.reorderingId.set(null);
            const check = this.historyService.checkReorderAvailability(orderDetail, liveItems);

            if (check.skippedItems.length > 0) {
              if (check.availableItems.length === 0) {
                this.notificationService.show({
                  type: 'error',
                  title: 'Cannot Reorder',
                  message: 'All items from this past order are currently sold out.',
                  duration: 4000
                });
                return;
              }
              // Show confirmation modal listing skipped items per PRD
              this.skippedModalData.set(check);
            } else {
              this.confirmReorder(check);
            }
          },
          error: () => this.reorderingId.set(null)
        });
      },
      error: () => {
        this.reorderingId.set(null);
        this.notificationService.show({
          type: 'error',
          title: 'Error',
          message: 'Failed to retrieve order details',
          duration: 3000
        });
      }
    });
  }

  confirmReorder(check: ReorderCheckResult): void {
    this.historyService.executeReorder(check.availableItems);
    this.skippedModalData.set(null);
    this.notificationService.show({
      type: 'success',
      title: 'Items Added to Cart',
      message: `${check.availableItems.length} dish(es) loaded into cart with current menu prices.`,
      duration: 3500
    });
    this.router.navigate(['/']);
  }
}

