import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { OrderDetail, OrderSummary } from '../models/order.model';
import { MenuService } from './menu.service';
import { CartService } from './cart.service';
import { MenuItem } from '../models/menu.model';

interface HistoryResponse {
  status: string;
  data: OrderSummary[];
  total: number;
  page: number;
  limit: number;
}

interface ApiResponse<T> {
  status: string;
  data: T;
}

export interface ReorderCheckResult {
  availableItems: { menuItem: MenuItem; quantity: number; note: string }[];
  skippedItems: string[];
}

@Injectable({
  providedIn: 'root'
})
export class OrderHistoryService {
  private http = inject(HttpClient);
  private menuService = inject(MenuService);
  private cartService = inject(CartService);

  readonly historyOrders = signal<OrderSummary[]>([]);

  getOrders(page: number = 1, limit: number = 20): Observable<OrderSummary[]> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<HistoryResponse>('/orders/history', { params }).pipe(
      map(res => res.data || []),
      tap(orders => {
        this.historyOrders.set(orders);
      })
    );
  }

  getOrderDetail(orderId: string): Observable<OrderDetail> {
    return this.http.get<ApiResponse<OrderDetail>>(`/orders/${orderId}`).pipe(
      map(res => res.data)
    );
  }

  /**
   * Pre-checks historical order items against current menu availability
   */
  checkReorderAvailability(order: OrderDetail, liveMenu: MenuItem[]): ReorderCheckResult {
    const availableItems: { menuItem: MenuItem; quantity: number; note: string }[] = [];
    const skippedItems: string[] = [];

    for (const orderItem of order.items) {
      const liveItem = liveMenu.find(m => m.id === orderItem.menu_item_id);
      if (liveItem && liveItem.is_available) {
        availableItems.push({
          menuItem: liveItem,
          quantity: orderItem.quantity,
          note: orderItem.note || ''
        });
      } else {
        skippedItems.push(orderItem.name || liveItem?.name || 'Dish Item');
      }
    }

    return { availableItems, skippedItems };
  }

  /**
   * Populates cart with available items at current prices
   */
  executeReorder(availableItems: { menuItem: MenuItem; quantity: number; note: string }[]): void {
    this.cartService.clearCart();
    for (const item of availableItems) {
      this.cartService.addToCart(item.menuItem, item.quantity, item.note);
    }
  }
}
