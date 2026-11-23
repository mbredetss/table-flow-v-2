import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuItem } from '../../core/models/menu.model';
import { CartService } from '../../core/services/cart.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-item-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (item) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-in fade-in">
        <div class="bg-canvas w-full max-w-lg rounded-md overflow-hidden shadow-airbnb-modal relative animate-in zoom-in-95">
          <!-- Close button -->
          <button
            type="button"
            (click)="close.emit()"
            class="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-ink flex items-center justify-center shadow-md transition-colors"
          >
            ✕
          </button>

          <!-- High-res Photo plate -->
          <div class="relative w-full h-64 bg-surface-soft overflow-hidden">
            <img
              [src]="item.photo"
              [alt]="item.name"
              class="w-full h-full object-cover"
            />
            @if (!item.is_available) {
              <div class="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                <span class="px-4 py-1.5 rounded-full bg-ink text-white font-badge uppercase tracking-wider">
                  Sold Out
                </span>
              </div>
            }
          </div>

          <!-- Content -->
          <div class="p-6">
            <div class="flex items-start justify-between gap-4 mb-2">
              <div>
                <span class="text-xs font-semibold text-muted uppercase tracking-wider">{{ item.category?.name || 'Menu' }}</span>
                <h3 class="font-display-md text-ink mt-0.5">{{ item.name }}</h3>
              </div>
              <span class="font-display-sm text-rausch font-bold shrink-0">
                Rp {{ item.price.toLocaleString('id-ID') }}
              </span>
            </div>

            <p class="font-body-md text-body mb-5">{{ item.description }}</p>

            @if (item.is_available) {
              <!-- Special Instructions / Notes -->
              <div class="mb-5">
                <label class="block font-caption text-ink mb-1.5 font-semibold">Special Instructions (optional)</label>
                <textarea
                  [(ngModel)]="note"
                  rows="2"
                  maxlength="255"
                  placeholder="e.g. No ice, extra spicy, sauce on the side..."
                  class="w-full p-3 rounded-sm border border-hairline focus:border-ink outline-none text-sm text-ink placeholder:text-muted resize-none"
                ></textarea>
              </div>

              <!-- Quantity & CTA Row -->
              <div class="flex items-center gap-4 pt-3 border-t border-hairline">
                <!-- Quantity Stepper -->
                <div class="flex items-center border border-hairline rounded-sm overflow-hidden h-12 bg-canvas shrink-0">
                  <button
                    type="button"
                    (click)="decrement()"
                    class="w-10 h-full flex items-center justify-center hover:bg-surface-soft text-ink text-lg font-bold transition"
                  >
                    -
                  </button>
                  <span class="w-10 text-center font-title-md font-bold text-ink">{{ quantity }}</span>
                  <button
                    type="button"
                    (click)="increment()"
                    class="w-10 h-full flex items-center justify-center hover:bg-surface-soft text-ink text-lg font-bold transition"
                  >
                    +
                  </button>
                </div>

                <!-- Add to Cart CTA -->
                <button
                  type="button"
                  (click)="addToCart()"
                  class="flex-1 h-12 rounded-sm bg-rausch hover:bg-rausch-active text-white font-medium text-sm transition shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Add to Cart</span>
                  <span>•</span>
                  <span>Rp {{ (item.price * quantity).toLocaleString('id-ID') }}</span>
                </button>
              </div>
            } @else {
              <!-- Sold out notice -->
              <div class="p-4 rounded-sm bg-surface-soft border border-hairline text-center text-muted font-body-sm">
                This item is currently sold out and cannot be ordered.
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class ItemDetailModalComponent {
  @Input() item: MenuItem | null = null;
  @Output() close = new EventEmitter<void>();

  private cartService = inject(CartService);
  private notificationService = inject(NotificationService);

  quantity = 1;
  note = '';

  increment(): void {
    this.quantity++;
  }

  decrement(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart(): void {
    if (!this.item || !this.item.is_available) return;

    this.cartService.addToCart(this.item, this.quantity, this.note);
    this.notificationService.show({
      type: 'success',
      title: 'Added to Cart',
      message: `${this.quantity}x ${this.item.name} added to your order`,
      duration: 3000
    });
    this.close.emit();
  }
}

