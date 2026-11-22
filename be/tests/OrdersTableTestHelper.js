import { Pool } from 'pg';

const pool = new Pool();

const OrdersTableTestHelper = {
  async addOrder({
    id = '44444444-4444-4444-8444-444444444444',
    customer_id = '00000000-0000-4000-8000-000000000001',
    table_number = '1',
    payment_reference = 'PAY-TEST-001',
    total_price = 25000,
    status = 'pending',
  } = {}) {
    const query = {
      text: `INSERT INTO orders (id, customer_id, table_number, payment_reference, total_price, status)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      values: [id, customer_id, table_number, payment_reference, total_price, status],
    };

    const result = await pool.query(query);
    return result.rows[0];
  },

  async addOrderItem({
    id = '55555555-5555-4555-8555-555555555555',
    order_id = '44444444-4444-4444-8444-444444444444',
    menu_item_id = '22222222-2222-4222-8222-222222222222',
    quantity = 1,
    note = 'no ice',
    unit_price = 25000,
  } = {}) {
    const query = {
      text: `INSERT INTO order_items (id, order_id, menu_item_id, quantity, note, unit_price)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      values: [id, order_id, menu_item_id, quantity, note, unit_price],
    };

    const result = await pool.query(query);
    return result.rows[0];
  },

  async findOrderById(id) {
    const query = {
      text: 'SELECT * FROM orders WHERE id = $1',
      values: [id],
    };
    const result = await pool.query(query);
    return result.rows[0] || null;
  },

  async findOrderItemsByOrderId(orderId) {
    const query = {
      text: 'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
      values: [orderId],
    };
    const result = await pool.query(query);
    return result.rows;
  },

  async cleanTable() {
    await pool.query('TRUNCATE TABLE order_items, orders CASCADE');
  },
};

export default OrdersTableTestHelper;
