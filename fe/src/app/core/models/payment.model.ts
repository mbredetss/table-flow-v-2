export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'cancelled';

export interface CreateOrderResponse {
  payment_id: string;
  qris_url: string;
  expires_at: string;
  order_id?: string;
}

export interface PaymentStatusResponse {
  payment_id: string;
  status: PaymentStatus;
  order_id?: string;
}
