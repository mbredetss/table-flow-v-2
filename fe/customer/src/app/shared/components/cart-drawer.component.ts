import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService, CartItem } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop Scrim (Mobile and Modal) -->
    <div
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] transition-opacity animate-in fade-in"
      (click)="close.emit()"
    ></div>

    <!-- Drawer Container (Airbnb Reservation Card aesthetic) -->
    <aside
      class="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-canvas shadow-airbnb-modal flex flex-col animate-in slide-in-from-right duration-300"
    >
      <!-- Drawer Header -->
      <div class="p-5 border-b border-hairline flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xl">🛒</span>
          <h3 class="font-display-sm text-ink">Your Table Order</h3>
        </div>
        <button
          type="button"
          (click)="close.emit()"
          class="w-8 h-8 rounded-full bg-surface-soft hover:bg-surface-strong text-ink flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Table Identification Bar -->
      <div class="px-5 py-3 bg-surface-soft border-b border-hairline flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-base">🪑</span>
          <span class="text-xs font-semibold text-ink">
            {{ cartService.tableNumber() ? 'Table #' + cartService.tableNumber() : 'No Table Connected' }}
          </span>
        </div>
        <button
          type="button"
          (click)="openQrModal.emit()"
          class="text-xs font-bold text-rausch hover:underline"
        >
          {{ cartService.tableNumber() ? 'Change' : 'Scan QR Table' }}
        </button>
      </div>

      <!-- If Table Missing Warning -->
      @if (!cartService.tableNumber()) {
        <div class="mx-5 mt-4 p-3 rounded-sm bg-rausch/10 border border-rausch/20 text-xs text-rausch font-medium flex items-center justify-between">
          <span>⚠️ Please scan the table QR code before checkout.</span>
          <button
            type="button"
            (click)="openQrModal.emit()"
            class="underline font-bold ml-2"
          >
            Scan Now
          </button>
        </div>
      }

      <!-- Items List -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4">
        @if (cartService.isCartEmpty()) {
          <div class="py-16 text-center">
            <div class="w-16 h-16 rounded-full bg-surface-soft text-2xl flex items-center justify-center mx-auto mb-3">
              🍽️
            </div>
            <h4 class="font-title-sm text-ink font-semibold">Your cart is empty</h4>
            <p class="font-body-sm text-muted mt-1 max-w-xs mx-auto">
              Explore our menu and tap "Add to Cart" to start your dining experience.
            </p>
          </div>
        } @else {
          @for (item of cartService.items(); track $index) {
            <div class="p-3.5 rounded-md border border-hairline bg-canvas flex flex-col gap-2">
              <div class="flex items-start justify-between gap-3">
                <div class="flex gap-3">
                  <img
                    [src]="item.menuItem.photo"
                    [alt]="item.menuItem.name"
                    class="w-14 h-14 object-cover rounded-sm border border-hairline shrink-0"
                  />
                  <div>
                    <h5 class="font-title-sm text-ink font-semibold line-clamp-1">{{ item.menuItem.name }}</h5>
                    <p class="font-body-sm text-muted">Rp {{ item.menuItem.price.toLocaleString('id-ID') }}</p>
                  </div>
                </div>

                <button
                  type="button"
                  (click)="cartService.removeItem($index)"
                  class="text-muted hover:text-rausch p-1 transition"
                  title="Remove item"
                >
                  🗑️
                </button>
              </div>

              <!-- Note row -->
              <div class="pt-1">
                <input
                  type="text"
                  [ngModel]="item.note"
                  (ngModelChange)="cartService.updateNote($index, $event)"
                  placeholder="Add note (e.g., no ice, extra spicy)..."
                  class="w-full text-xs py-1.5 px-2.5 rounded-sm border border-hairline focus:border-ink outline-none text-ink bg-surface-soft/50 placeholder:text-muted"
                />
              </div>

              <!-- Quantity control & Subtotal -->
              <div class="flex items-center justify-between pt-2 border-t border-hairline-soft">
                <div class="flex items-center border border-hairline rounded-sm overflow-hidden bg-canvas">
                  <button
                    type="button"
                    (click)="cartService.updateQuantity($index, item.quantity - 1)"
                    class="w-7 h-7 flex items-center justify-center hover:bg-surface-soft text-ink font-bold transition text-xs"
                  >
                    -
                  </button>
                  <span class="w-8 text-center text-xs font-semibold text-ink">{{ item.quantity }}</span>
                  <button
                    type="button"
                    (click)="cartService.updateQuantity($index, item.quantity + 1)"
                    class="w-7 h-7 flex items-center justify-center hover:bg-surface-soft text-ink font-bold transition text-xs"
                  >
                    +
                  </button>
                </div>

                <span class="font-title-sm font-semibold text-ink">
                  Rp {{ (item.menuItem.price * item.quantity).toLocaleString('id-ID') }}
                </span>
              </div>
            </div>
          }
        }
      </div>

      <!-- Drawer Footer with Total & Checkout Button -->
      @if (!cartService.isCartEmpty()) {
        <div class="p-5 border-t border-hairline bg-canvas">
          <div class="flex items-center justify-between mb-4">
            <span class="font-title-md text-muted">Total Payment</span>
            <span class="font-display-sm text-ink font-bold">
              Rp {{ cartService.totalPrice().toLocaleString('id-ID') }}
            </span>
          </div>

          <button
            type="button"
            (click)="proceedToCheckout()"
            class="w-full h-12 rounded-sm bg-rausch hover:bg-rausch-active text-white font-medium text-base transition shadow-sm flex items-center justify-center gap-2"
          >
            <span>Proceed to Payment</span>
            <span>→</span>
          </button>
        </div>
      }
    </aside>
  `
})
export class CartDrawerComponent {
  @Output() close = new EventEmitter<void>();
  @Output() openQrModal = new EventEmitter<void>();
  @Output() openLoginModal = new EventEmitter<void>();

  readonly cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  proceedToCheckout(): void {
    if (!this.authService.isLoggedIn()) {
      this.notificationService.show({
        type: 'info',
        title: 'Login Required',
        message: 'Please log in to proceed with your order.',
        duration: 4000
      });
      this.openLoginModal.emit();
      return;
    }

    if (!this.cartService.tableNumber()) {
      this.notificationService.show({
        type: 'warning',
        title: 'Table Required',
        message: 'Please scan the table QR code before checkout.',
        duration: 4000
      });
      this.openQrModal.emit();
      return;
    }

    this.close.emit();
    this.router.navigate(['/payment']);
  }
}
