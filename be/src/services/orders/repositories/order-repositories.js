import { Pool } from 'pg';

class OrderRepositories {
  constructor() {
    this.pool = new Pool();
  }

  getPool() {
    return this.pool;
  }

  async findByPaymentReference(paymentReference) {
    const query = 'SELECT id FROM orders WHERE payment_reference = $1';
    const result = await this.pool.query(query, [paymentReference]);
    return result.rows[0] || null;
  }

  async createOrder(client, { customer_id, table_number, payment_reference, total_price }) {
    const query = `
      INSERT INTO orders (customer_id, table_number, payment_reference, total_price)
      VALUES ($1, $2, $3, $4)
      RETURNING id, total_price
    `;
    const result = await client.query(query, [
      customer_id,
      table_number,
      payment_reference,
      total_price,
    ]);
    return result.rows[0];
  }

  async createOrderItem(client, { order_id, menu_item_id, quantity, note, unit_price }) {
    const query = `
      INSERT INTO order_items (order_id, menu_item_id, quantity, note, unit_price)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const result = await client.query(query, [
      order_id,
      menu_item_id,
      quantity,
      note || null,
      unit_price,
    ]);
    return result.rows[0];
  }

  async getOrderById(id) {
    const query = `
      SELECT o.id, o.customer_id, o.table_number, o.total_price,
             o.payment_reference, o.created_at, o.updated_at,
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'order_id', oi.order_id,
                  'menu_item_id', oi.menu_item_id,
                  'quantity', oi.quantity,
                  'note', oi.note,
                  'unit_price', oi.unit_price,
                  'created_at', oi.created_at
                ) ORDER BY oi.created_at ASC
              ) AS items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

export default new OrderRepositories();
