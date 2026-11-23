import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TopNavComponent } from './shared/components/top-nav.component';
import { CartDrawerComponent } from './shared/components/cart-drawer.component';
import { LoginModalComponent } from './shared/components/login-modal.component';
import { QrScannerModalComponent } from './shared/components/qr-scanner-modal.component';
import { NotificationBannerComponent } from './shared/components/notification-banner.component';
import { CartService } from './core/services/cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    TopNavComponent,
    CartDrawerComponent,
    LoginModalComponent,
    QrScannerModalComponent,
    NotificationBannerComponent
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-canvas text-ink">
      <!-- Global Top Floating Notification Banner -->
      <app-notification-banner></app-notification-banner>

      <!-- Airbnb Signature Top Navigation -->
      <app-top-nav
        (openLoginModal)="showLoginModal = true"
        (openQrModal)="showQrModal = true"
        (toggleCart)="showCart = !showCart"
      ></app-top-nav>

      <!-- Main Application Views -->
      <main class="flex-1 pb-24 md:pb-8">
        <router-outlet></router-outlet>
      </main>

      <!-- Mobile Sticky Floating Cart Bar (< 744px, per DESIGN.md) -->
      @if (!cartService.isCartEmpty()) {
        <div class="md:hidden fixed bottom-4 left-4 right-4 z-40 animate-in slide-in-from-bottom-4">
          <button
            type="button"
            (click)="showCart = true"
            class="w-full h-14 bg-rausch hover:bg-rausch-active text-white rounded-full shadow-lg flex items-center justify-between px-6 transition active:scale-98"
          >
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-white/20 text-xs font-bold flex items-center justify-center">
                {{ cartService.itemCount() }}
              </span>
              <span class="font-title-sm font-semibold">View Order</span>
            </div>
            <span class="font-title-md font-bold">
              Rp {{ cartService.totalPrice().toLocaleString('id-ID') }}
            </span>
          </button>
        </div>
      }

      <!-- Airbnb Footer -->
      <footer class="bg-surface-soft border-t border-hairline pt-12 pb-8 mt-auto">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10 border-b border-hairline">
            <div>
              <h5 class="font-title-sm font-bold text-ink mb-3">About TableFlow</h5>
              <p class="font-body-sm text-muted leading-relaxed">
                TableFlow eliminates long queues at dining establishments. Order directly from your seat, pay with instant QRIS, and enjoy live kitchen fulfillment.
              </p>
            </div>
            <div>
              <h5 class="font-title-sm font-bold text-ink mb-3">Seamless Dining Experience</h5>
              <p class="font-body-sm text-muted">
                Designed with Airbnb's warm, generous consumer design language. Anchored on clean white surfaces and iconic Rausch (#ff385c).
              </p>
            </div>
          </div>

          <!-- Legal Band -->
          <div class="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted gap-4">
            <p>© 2026 TableFlow Customer Portal. All rights reserved.</p>
            <div class="flex items-center gap-4">
              <span>Customer Edition</span>
              <span>IDR (Rp)</span>
              <span>Clean White Canvas System</span>
            </div>
          </div>
        </div>
      </footer>

      <!-- Modals and Drawers -->
      @if (showCart) {
        <app-cart-drawer
          (close)="showCart = false"
          (openQrModal)="showQrModal = true; showCart = false"
          (openLoginModal)="showLoginModal = true; showCart = false"
        ></app-cart-drawer>
      }

      @if (showLoginModal) {
        <app-login-modal
          (close)="showLoginModal = false"
        ></app-login-modal>
      }

      @if (showQrModal) {
        <app-qr-scanner-modal
          (close)="showQrModal = false"
        ></app-qr-scanner-modal>
      }
    </div>
  `
})
export class AppComponent implements OnInit {
  readonly cartService = inject(CartService);

  showCart = false;
  showLoginModal = false;
  showQrModal = false;

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tableParam = urlParams.get('table');
      if (tableParam) {
        this.cartService.setTableNumber(tableParam);
      }
    }
  }
}
