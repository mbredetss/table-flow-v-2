import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, tap, map } from 'rxjs';
import { CreateOrderRequest } from '../models/order.model';
import { CreateOrderResponse, PaymentStatus, PaymentStatusResponse } from '../models/payment.model';
import { CartService } from './cart.service';

interface ApiResponse<T> {
  status: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private cartService = inject(CartService);

  readonly currentPaymentId = signal<string | null>(null);
  readonly currentQrisUrl = signal<string | null>(null);
  readonly currentOrderId = signal<string | null>(
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('tableflow_active_order_id') : null
  );
  readonly expiresAt = signal<Date | null>(null);
  readonly paymentStatus = signal<PaymentStatus>('pending');
  readonly remainingSeconds = signal<number>(900); // 15 mins default
  readonly isPolling = signal<boolean>(false);

  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  createOrder(payload: CreateOrderRequest): Observable<CreateOrderResponse> {
    return this.http.post<ApiResponse<CreateOrderResponse>>('/orders', payload).pipe(
      map(res => res.data),
      tap((data) => {
        this.setupPaymentSession(data);
      })
    );
  }

  private setupPaymentSession(data: CreateOrderResponse): void {
    this.currentPaymentId.set(data.payment_id);
    this.currentQrisUrl.set(data.qris_url);
    if (data.order_id) {
      this.currentOrderId.set(data.order_id);
    }
    const expiry = new Date(data.expires_at || Date.now() + 15 * 60 * 1000);
    this.expiresAt.set(expiry);
    this.paymentStatus.set('pending');

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
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('tableflow_active_order_id', res.order_id);
            }
          }
          this.paymentStatus.set('paid');
          this.stopPolling();
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
        }
        if (data?.order_id) {
          this.currentOrderId.set(data.order_id);
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('tableflow_active_order_id', data.order_id);
          }
        }
      })
    );
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
    this.currentPaymentId.set(null);
    this.currentQrisUrl.set(null);
    this.currentOrderId.set(null);
    this.expiresAt.set(null);
    this.paymentStatus.set('pending');
    this.remainingSeconds.set(900);
  }
}
