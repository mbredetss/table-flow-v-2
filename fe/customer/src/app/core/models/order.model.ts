import { MenuItem } from './menu.model';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed';

export interface OrderItemRequest {
  menu_item_id: string;
  quantity: number;
  note?: string;
}

export interface CreateOrderRequest {
  table_number: string;
  payment_reference: string;
  items: OrderItemRequest[];
}

export interface OrderItemDetail {
  id: string;
  order_id?: string;
  menu_item_id: string;
  quantity: number;
  note?: string | null;
  unit_price: number;
  name?: string;
  menu_item?: MenuItem;
  created_at?: string;
}

export interface OrderDetail {
  id: string;
  customer_id?: string;
  table_number: string;
  status: OrderStatus;
  total_price: number;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
  items: OrderItemDetail[];
}

export interface OrderSummary {
  id: string;
  created_at: string;
  total_price: number;
  status: OrderStatus;
}

export interface OrderHistoryResponse {
  data: OrderSummary[];
  total: number;
  page: number;
  limit: number;
}
