import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, tap, map } from 'rxjs';
import { CreateOrderRequest } from '../models/order.model';
import { CreateOrderResponse, PaymentStatus, PaymentStatusResponse } from '../models/payment.model';
import { CartService, CartItem } from './cart.service';

interface ApiResponse<T> {
  status: string;
  data: T;
}

export interface StoredPaymentSession {
  payment_id: string;
  order_id?: string;
  qris_url: string;
  expires_at: string;
  table_number: string;
  total_amount: number;
  created_at: number;
  items?: {
    menu_item_id: string;
    quantity: number;
    note?: string;
  }[];
}

const PAYMENT_SESSION_KEY = 'tableflow_active_payment_session';
const ACTIVE_ORDER_ID_KEY = 'tableflow_active_order_id';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private cartService = inject(CartService);

  readonly currentPaymentId = signal<string | null>(null);
  readonly currentQrisUrl = signal<string | null>(null);
  readonly currentOrderId = signal<string | null>(this.loadStoredOrderId());
  readonly currentTableNumber = signal<string | null>(null);
  readonly currentTotalAmount = signal<number>(0);
  readonly expiresAt = signal<Date | null>(null);
  readonly paymentStatus = signal<PaymentStatus>('pending');
  readonly remainingSeconds = signal<number>(900); // 15 mins default
  readonly isPolling = signal<boolean>(false);

  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Automatically attempt to restore any ongoing session on service initialization
    this.restorePaymentSession();
  }

  private loadStoredOrderId(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(ACTIVE_ORDER_ID_KEY) || localStorage.getItem(ACTIVE_ORDER_ID_KEY);
  }

  /**
   * Restores an active, unexpired payment session from persistent storage.
   * Prevents creating duplicate orders when refreshing/relogging.
   * Returns true if an active or unexpired session was found and restored.
   */
  restorePaymentSession(): boolean {
    if (typeof window === 'undefined') return false;

    const raw = localStorage.getItem(PAYMENT_SESSION_KEY);
    if (!raw) return false;

    try {
      const session: StoredPaymentSession = JSON.parse(raw);
      if (!session.payment_id || !session.expires_at || !session.qris_url) {
        this.clearActivePaymentSession();
        return false;
      }

      const expiry = new Date(session.expires_at);
      const now = Date.now();
      const diff = Math.floor((expiry.getTime() - now) / 1000);

      this.currentPaymentId.set(session.payment_id);
      this.currentQrisUrl.set(session.qris_url);
      if (session.order_id) {
        this.currentOrderId.set(session.order_id);
      }
      this.currentTableNumber.set(session.table_number || null);
      this.currentTotalAmount.set(session.total_amount || 0);
      this.expiresAt.set(expiry);

      if (session.table_number && !this.cartService.tableNumber()) {
        this.cartService.setTableNumber(session.table_number);
      }

      if (diff > 0) {
        // Session is still active within the 15-minute window!
        this.paymentStatus.set('pending');
        this.remainingSeconds.set(diff);
        this.startCountdown(expiry);
        this.startPolling(session.payment_id);
        return true;
      } else {
        // Window expired while away
        this.paymentStatus.set('expired');
        this.remainingSeconds.set(0);
        this.stopPolling();
        return true;
      }
    } catch {
      this.clearActivePaymentSession();
      return false;
    }
  }

  createOrder(payload: CreateOrderRequest, totalAmount?: number): Observable<CreateOrderResponse> {
    return this.http.post<ApiResponse<CreateOrderResponse>>('/orders', payload).pipe(
      map(res => res.data),
      tap((data) => {
        const total = totalAmount ?? this.cartService.totalPrice();
        this.setupPaymentSession(data, payload.table_number, total, payload.items);
      })
    );
  }

  private setupPaymentSession(
    data: CreateOrderResponse,
    tableNumber: string,
    totalAmount: number,
    items: CreateOrderRequest['items']
  ): void {
    const expiry = new Date(data.expires_at || Date.now() + 15 * 60 * 1000);

    this.currentPaymentId.set(data.payment_id);
    this.currentQrisUrl.set(data.qris_url);
    if (data.order_id) {
      this.currentOrderId.set(data.order_id);
      this.saveOrderId(data.order_id);
    }
    this.currentTableNumber.set(tableNumber);
    this.currentTotalAmount.set(totalAmount);
    this.expiresAt.set(expiry);
    this.paymentStatus.set('pending');

    // Persist session to localStorage so reload/relog does not create a duplicate order
    if (typeof window !== 'undefined') {
      const session: StoredPaymentSession = {
        payment_id: data.payment_id,
        order_id: data.order_id,
        qris_url: data.qris_url,
        expires_at: expiry.toISOString(),
        table_number: tableNumber,
        total_amount: totalAmount,
        created_at: Date.now(),
        items
      };
      localStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify(session));
    }

    this.startCountdown(expiry);
    this.startPolling(data.payment_id);
  }

  private startCountdown(expiry: Date): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    const updateRemaining = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiry.getTime() - now) / 1000));
      this.remainingSeconds.set(diff);

      if (diff <= 0) {
        this.paymentStatus.set('expired');
        this.stopPolling();
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
      }
    };

    updateRemaining();
    this.countdownTimer = setInterval(updateRemaining, 1000);
  }

  startPolling(paymentId: string): void {
    // Stop any existing poll stream first
    this.stopPolling();
    this.isPolling.set(true);

    // Poll every 4 seconds while pending per API docs
    const poll$ = interval(4000).pipe(
      takeWhile(() => this.isPolling() && this.paymentStatus() === 'pending'),
      switchMap(() => this.checkStatus(paymentId))
    );

    poll$.subscribe({
      next: (res) => {
        if (res.status === 'paid') {
          if (res.order_id) {
            this.currentOrderId.set(res.order_id);
            this.saveOrderId(res.order_id);
          }
          this.paymentStatus.set('paid');
          this.stopPolling();
          this.clearActivePaymentSession();
          this.cartService.clearCart();
        } else if (res.status === 'expired') {
          this.paymentStatus.set('expired');
          this.stopPolling();
        } else if (res.status === 'failed') {
          this.paymentStatus.set('failed');
          this.stopPolling();
        }
      },
      error: () => {
        // Continue polling on transient network hiccup
      }
    });
  }

  checkStatus(paymentId: string): Observable<PaymentStatusResponse> {
    return this.http.get<ApiResponse<PaymentStatusResponse>>(`/payments/${paymentId}/status`).pipe(
      map(res => res.data),
      tap((data) => {
        if (data?.status) {
          this.paymentStatus.set(data.status);
          if (data.status === 'paid') {
            this.clearActivePaymentSession();
            this.cartService.clearCart();
          }
        }
        if (data?.order_id) {
          this.currentOrderId.set(data.order_id);
          this.saveOrderId(data.order_id);
        }
      })
    );
  }

  private saveOrderId(orderId: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(ACTIVE_ORDER_ID_KEY, orderId);
      localStorage.setItem(ACTIVE_ORDER_ID_KEY, orderId);
    }
  }

  clearActivePaymentSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PAYMENT_SESSION_KEY);
    }
  }

  stopPolling(): void {
    this.isPolling.set(false);
  }

  reset(): void {
    this.stopPolling();
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.clearActivePaymentSession();
    this.currentPaymentId.set(null);
    this.currentQrisUrl.set(null);
    this.currentOrderId.set(null);
    this.currentTableNumber.set(null);
    this.currentTotalAmount.set(0);
    this.expiresAt.set(null);
    this.paymentStatus.set('pending');
    this.remainingSeconds.set(900);
  }
}
