import { Pool } from 'pg';

class OrderRepositories {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
      SELECT o.id, o.customer_id, o.table_number, o.total_price, o.status, 
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

  async getActiveOrders() {
    const query = `
      SELECT o.id, o.customer_id, o.table_number, o.total_price, o.status, 
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
      WHERE o.status != 'completed'
      GROUP BY o.id
      ORDER BY o.created_at ASC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getCustomerHistory(customerId, page, limit) {
    const offset = (page - 1) * limit;

    const countQuery = 'SELECT COUNT(id)::int AS total FROM orders WHERE customer_id = $1';
    const countResult = await this.pool.query(countQuery, [customerId]);
    const total = countResult.rows[0].total;

    const dataQuery = `
      SELECT id, created_at, total_price, status
      FROM orders
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const dataResult = await this.pool.query(dataQuery, [customerId, limit, offset]);

    return { data: dataResult.rows, total };
  }

  async updateOrderStatus(id, status) {
    const query = `
      UPDATE orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [status, id]);
    return result.rows[0] || null;
  }
}

export default new OrderRepositories();
