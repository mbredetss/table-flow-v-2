import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PaymentService } from '../../core/services/payment.service';
import { CartService } from '../../core/services/cart.service';
import { CreateOrderRequest } from '../../core/models/order.model';

@Component({
  selector: 'app-payment-screen',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-8">
      @if (paymentService.paymentStatus() === 'paid') {
        <!-- PAYMENT SUCCESS VIEW -->
        <div class="bg-canvas rounded-md border border-hairline p-8 shadow-airbnb text-center animate-in zoom-in-95">
          <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
            ✓
          </div>
          <span class="text-xs uppercase font-bold tracking-wider text-emerald-600">Payment Confirmed</span>
          <h2 class="font-display-md text-ink mt-1">Order Sent to Kitchen!</h2>
          <p class="font-body-md text-muted mt-2 max-w-md mx-auto">
            Your payment via QRIS has been verified. The kitchen staff is now preparing your order.
          </p>

          <div class="my-6 p-4 rounded-md bg-surface-soft border border-hairline inline-block text-left w-full max-w-sm">
            <div class="flex justify-between py-1 border-b border-hairline">
              <span class="font-body-sm text-muted">Table:</span>
              <span class="font-title-sm font-bold text-ink">Table {{ displayTableNumber() }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="font-body-sm text-muted">Status:</span>
              <span class="font-title-sm font-semibold text-rausch">Preparing</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              (click)="goToTracking()"
              class="h-12 px-6 rounded-sm bg-rausch hover:bg-rausch-active text-white font-medium text-sm transition shadow-sm"
            >
              Track Order Status Live →
            </button>
            <a
              routerLink="/"
              class="h-12 px-6 rounded-sm border border-hairline hover:border-ink bg-canvas text-ink font-medium text-sm transition flex items-center justify-center"
            >
              Back to Menu
            </a>
          </div>
        </div>
      } @else if (paymentService.paymentStatus() === 'expired') {
        <!-- PAYMENT EXPIRED VIEW -->
        <div class="bg-canvas rounded-md border border-hairline p-8 shadow-airbnb text-center">
          <div class="w-16 h-16 rounded-full bg-rausch/10 text-rausch flex items-center justify-center text-3xl mx-auto mb-4">
            ⏱️
          </div>
          <h2 class="font-display-md text-ink">QRIS Payment Expired</h2>
          <p class="font-body-md text-muted mt-2 max-w-md mx-auto">
            The 15-minute payment window has expired. Your cart items have been preserved. You can generate a new QRIS code below.
          </p>
          <div class="mt-6 flex justify-center gap-4">
            <button
              type="button"
              (click)="generateQris()"
              class="h-12 px-6 rounded-sm bg-rausch hover:bg-rausch-active text-white font-medium text-sm transition shadow-sm"
            >
              Generate New QRIS Code
            </button>
            <a
              routerLink="/"
              class="h-12 px-6 rounded-sm border border-hairline text-ink font-medium text-sm transition flex items-center justify-center"
            >
              Review Cart
            </a>
          </div>
        </div>
      } @else {
        <!-- ACTIVE QRIS PAYMENT VIEW -->
        <div class="bg-canvas rounded-md border border-hairline shadow-airbnb overflow-hidden">
          <div class="p-6 border-b border-hairline bg-surface-soft flex items-center justify-between">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-muted">Cashless Checkout</span>
              <h2 class="font-display-sm text-ink">Scan QRIS with Any E-Wallet</h2>
            </div>
            <div class="text-right">
              <span class="text-xs text-muted block">Table #{{ displayTableNumber() }}</span>
              <span class="font-title-md font-bold text-rausch">
                Rp {{ displayTotalPrice().toLocaleString('id-ID') }}
              </span>
            </div>
          </div>

          <div class="p-8 text-center flex flex-col items-center">
            <!-- 15-Minute Countdown Timer Badge -->
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rausch/10 text-rausch font-caption font-bold mb-6">
              <span class="animate-pulse">●</span>
              <span>Expires in: {{ formattedTimer() }}</span>
            </div>

            <!-- Scannable QRIS Plate -->
            <div class="p-4 bg-white rounded-md border-2 border-hairline shadow-sm relative inline-block mb-4">
              @if (paymentService.currentQrisUrl()) {
                <img
                  [src]="paymentService.currentQrisUrl()"
                  alt="QRIS Code"
                  class="w-64 h-64 object-contain mx-auto"
                />
              } @else {
                <div class="w-64 h-64 flex items-center justify-center bg-surface-soft rounded-sm">
                  <div class="animate-spin w-8 h-8 border-2 border-rausch border-t-transparent rounded-full"></div>
                </div>
              }
              <div class="mt-2 flex items-center justify-center gap-2 text-xs font-semibold text-muted">
                <span>GOPAY</span> • <span>OVO</span> • <span>DANA</span> • <span>BCA</span> • <span>SHOPEEPAY</span>
              </div>
            </div>

            <p class="font-body-sm text-muted max-w-sm">
              Open your mobile banking or e-wallet app, select <span class="font-semibold text-ink">Scan QRIS</span>, and authorize payment of <span class="font-semibold text-ink">Rp {{ displayTotalPrice().toLocaleString('id-ID') }}</span>.
            </p>

            <!-- Realtime Polling Indicator -->
            <div class="flex items-center gap-2 mt-4 text-xs text-muted">
              <div class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              <span>Awaiting payment confirmation...</span>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class PaymentScreenComponent implements OnInit, OnDestroy {
  readonly paymentService = inject(PaymentService);
  readonly cartService = inject(CartService);
  private router = inject(Router);

  displayTableNumber(): string {
    return this.paymentService.currentTableNumber() || this.cartService.tableNumber() || '01';
  }

  displayTotalPrice(): number {
    const sessionTotal = this.paymentService.currentTotalAmount();
    return sessionTotal > 0 ? sessionTotal : this.cartService.totalPrice();
  }

  ngOnInit(): void {
    // 1. Attempt to restore any active ongoing payment session (e.g. from reload or relog)
    const restored = this.paymentService.restorePaymentSession();
    if (restored && this.paymentService.currentQrisUrl()) {
      // Existing pending order restored with its accurate remaining countdown.
      // Do NOT create a duplicate order.
      return;
    }

    // 2. If no active order exists and cart is empty, redirect to menu
    if (this.cartService.isCartEmpty() && this.paymentService.paymentStatus() !== 'paid') {
      this.router.navigate(['/']);
      return;
    }

    // 3. If cart has items and no active order exists yet, generate order & QRIS
    if (!this.paymentService.currentQrisUrl()) {
      this.generateQris();
    }
  }

  ngOnDestroy(): void {
    this.paymentService.stopPolling();
  }

  formattedTimer(): string {
    const sec = this.paymentService.remainingSeconds();
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  generateQris(): void {
    const tableNumber = this.displayTableNumber();
    const items = this.cartService.items().map(it => ({
      menu_item_id: it.menuItem.id,
      quantity: it.quantity,
      note: it.note
    }));

    if (items.length === 0) {
      this.router.navigate(['/']);
      return;
    }

    const payload: CreateOrderRequest = {
      table_number: tableNumber,
      payment_reference: 'ORDER-PAY-' + Date.now(),
      items
    };

    const total = this.cartService.totalPrice();
    this.paymentService.createOrder(payload, total).subscribe();
  }

  goToTracking(): void {
    const orderId = this.paymentService.currentOrderId();
    if (orderId) {
      this.router.navigate(['/tracking'], { queryParams: { id: orderId } });
    } else {
      this.router.navigate(['/history']);
    }
  }
}
