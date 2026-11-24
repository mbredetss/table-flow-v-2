import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { OrderDetail, OrderStatus } from '../models/order.model';
import { AuthService } from './auth.service';
import { AudioService } from './audio.service';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

interface ActiveOrdersResponse {
  pending?: OrderDetail[];
  preparing?: OrderDetail[];
  ready?: OrderDetail[];
  completed?: OrderDetail[];
}

interface ApiResponse<T> {
  status: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private audioService = inject(AudioService);
  private notificationService = inject(NotificationService);

  readonly pendingOrders = signal<OrderDetail[]>([]);
  readonly preparingOrders = signal<OrderDetail[]>([]);
  readonly readyOrders = signal<OrderDetail[]>([]);
  readonly completedOrders = signal<OrderDetail[]>([]);

  readonly isConnected = signal<boolean>(false);
  readonly newOrderPulseId = signal<string | null>(null);

  private eventSource: EventSource | null = null;

  loadOrders(): Observable<ActiveOrdersResponse> {
    return this.http.get<ApiResponse<ActiveOrdersResponse>>(`${environment.apiUrl}/orders`).pipe(
      map(res => res.data),
      tap((data) => {
        this.pendingOrders.set(data?.pending || []);
        this.preparingOrders.set(data?.preparing || []);
        this.readyOrders.set(data?.ready || []);
        this.completedOrders.set(data?.completed || []);
        this.connectSSE();
      })
    );
  }

  connectSSE(): void {
    this.disconnectSSE();

    const token = this.authService.getToken();
    if (!token) return;

    const sseUrl = `${environment.apiUrl}/sse/dashboard?token=${encodeURIComponent(token)}`;

    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isConnected.set(true);
      };

      this.eventSource.addEventListener('new_order', (event: MessageEvent) => {
        try {
          const order: OrderDetail = JSON.parse(event.data);
          this.handleNewOrder(order);
        } catch {
          // Parse error
        }
      });

      this.eventSource.addEventListener('order_status_updated', (event: MessageEvent) => {
        try {
          const update = JSON.parse(event.data);
          this.moveOrderToStatus(update.order_id, update.new_status);
        } catch {
          // Parse error
        }
      });

      this.eventSource.onerror = () => {
        this.isConnected.set(false);
      };
    } catch {
      this.isConnected.set(false);
    }
  }

  handleNewOrder(order: OrderDetail): void {
    // 1. Play audio chime
    this.audioService.playChime();

    // 2. Add to pending column
    this.pendingOrders.update(list => [order, ...list]);

    // 3. Highlight with pulse for 5 seconds
    this.newOrderPulseId.set(order.id);
    setTimeout(() => {
      if (this.newOrderPulseId() === order.id) {
        this.newOrderPulseId.set(null);
      }
    }, 5000);

    // 4. In-app notification
    this.notificationService.show({
      type: 'info',
      title: 'New Order Arrived! 🔔',
      message: `Table #${order.table_number} placed Order #${order.id} (Rp ${order.total_price.toLocaleString('id-ID')})`,
      duration: 5000
    });
  }

  advanceStatus(orderId: string, currentStatus: OrderStatus): Observable<any> {
    const nextStatusMap: Record<OrderStatus, OrderStatus | null> = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'completed',
      completed: null
    };

    const nextStatus = nextStatusMap[currentStatus];
    if (!nextStatus) return new Observable(observer => observer.complete());

    return this.http.patch<ApiResponse<OrderDetail>>(`${environment.apiUrl}/orders/${orderId}/status`, { status: nextStatus }).pipe(
      tap(() => {
        this.moveOrderToStatus(orderId, nextStatus);
      })
    );
  }

  moveOrderToStatus(orderId: string, nextStatus: OrderStatus): void {
    let targetOrder: OrderDetail | undefined;

    const findAndRemove = (list: OrderDetail[]) => {
      const idx = list.findIndex(o => o.id === orderId);
      if (idx > -1) {
        targetOrder = list[idx];
        const copy = [...list];
        copy.splice(idx, 1);
        return copy;
      }
      return list;
    };

    this.pendingOrders.update(findAndRemove);
    if (!targetOrder) this.preparingOrders.update(findAndRemove);
    if (!targetOrder) this.readyOrders.update(findAndRemove);
    if (!targetOrder) this.completedOrders.update(findAndRemove);

    if (targetOrder) {
      const updated: OrderDetail = {
        ...targetOrder,
        status: nextStatus,
        updated_at: new Date().toISOString()
      };

      if (nextStatus === 'pending') {
        this.pendingOrders.update(l => [updated, ...l]);
      } else if (nextStatus === 'preparing') {
        this.preparingOrders.update(l => [updated, ...l]);
      } else if (nextStatus === 'ready') {
        this.readyOrders.update(l => [updated, ...l]);
      } else if (nextStatus === 'completed') {
        this.completedOrders.update(l => [updated, ...l]);
      }
    }
  }

  disconnectSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected.set(false);
  }
}
