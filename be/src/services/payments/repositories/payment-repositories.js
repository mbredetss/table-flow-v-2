import { Pool } from 'pg';

class PaymentRepositories {
  constructor() {
    this.pool = new Pool();
  }

  getPool() {
    return this.pool;
  }

  async insert({ customer_id, midtrans_order_id, amount, qris_url, cart_snapshot, expires_at }) {
    const query = `
      INSERT INTO payments
        (customer_id, midtrans_order_id, amount, qris_url, cart_snapshot, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, status, expires_at
    `;
    const result = await this.pool.query(query, [
      customer_id,
      midtrans_order_id,
      amount,
      qris_url,
      JSON.stringify(cart_snapshot),
      expires_at,
    ]);
    return result.rows[0];
  }

  async getByMidtransOrderId(midtransOrderId) {
    const query = 'SELECT * FROM payments WHERE midtrans_order_id = $1';
    const result = await this.pool.query(query, [midtransOrderId]);
    return result.rows[0] || null;
  }

  async getById(id) {
    const query = 'SELECT * FROM payments WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateStatus(client, id, status) {
    const query = `
      UPDATE payments SET status = $1, updated_at = now()
      WHERE id = $2
      RETURNING id, status, order_id
    `;
    const result = await client.query(query, [status, id]);
    return result.rows[0];
  }

  async setOrderId(client, id, orderId) {
    const query = `
      UPDATE payments SET order_id = $1, updated_at = now()
      WHERE id = $2
    `;
    await client.query(query, [orderId, id]);
  }
}

export default new PaymentRepositories();
