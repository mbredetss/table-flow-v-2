import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { OrderDetail, OrderStatus } from '../models/order.model';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { AudioService } from './audio.service';

interface ApiResponse<T> {
  status: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class OrderTrackingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private audioService = inject(AudioService);

  readonly currentOrder = signal<OrderDetail | null>(null);
  readonly currentStatus = signal<OrderStatus>('pending');
  readonly isConnected = signal<boolean>(false);
  private eventSource: EventSource | null = null;

  loadOrder(orderId: string): Observable<OrderDetail> {
    return this.http.get<ApiResponse<OrderDetail>>(`/orders/${orderId}`).pipe(
      map(res => res.data),
      tap((order) => {
        this.currentOrder.set(order);
        this.currentStatus.set(order.status);
        this.connectSse(orderId);
      })
    );
  }

  connectSse(orderId: string): void {
    this.disconnectSse();

    const token = this.authService.getToken();
    if (!token) return;

    const sseUrl = `/sse/orders/${orderId}/status?token=${encodeURIComponent(token)}`;

    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isConnected.set(true);
      };

      this.eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.new_status) {
            this.handleStatusUpdate(data.new_status);
          } else if (data.status) {
            this.handleStatusUpdate(data.status);
          }
        } catch {
          // ignore
        }
      };

      this.eventSource.addEventListener('order_status_updated', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.handleStatusUpdate(data.new_status || data.status);
        } catch {
          // Parse error
        }
      });

      this.eventSource.addEventListener('order_completed', () => {
        this.handleStatusUpdate('completed');
        this.disconnectSse();
      });

      this.eventSource.onerror = () => {
        this.isConnected.set(false);
      };
    } catch {
      this.isConnected.set(false);
    }
  }

  handleStatusUpdate(newStatus: OrderStatus): void {
    const prevStatus = this.currentStatus();
    this.currentStatus.set(newStatus);

    if (this.currentOrder()) {
      this.currentOrder.set({
        ...this.currentOrder()!,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
    }

    if (newStatus === 'ready' && prevStatus !== 'ready') {
      this.audioService.playCelebration();
      this.notificationService.show({
        type: 'ready',
        title: 'Your Order is Ready! 🎉',
        message: 'Please pick up your food at the serving counter.',
        duration: 10000
      });
    }
  }

  disconnectSse(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected.set(false);
  }
}
