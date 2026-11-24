import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PaymentsTableTestHelper = {
  async addPayment({
    id = crypto.randomUUID(),
    customer_id = '00000000-0000-4000-8000-000000000001',
    midtrans_order_id = `TF-${crypto.randomUUID()}`,
    amount = 25000,
    status = 'pending',
    qris_url = 'https://example.com/qris.png',
    cart_snapshot = { table_number: '1', items: [] },
    order_id = null,
    expires_at = new Date(Date.now() + 15 * 60 * 1000),
  } = {}) {
    const query = {
      text: `INSERT INTO payments
               (id, customer_id, midtrans_order_id, amount, status, qris_url,
                cart_snapshot, order_id, expires_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      values: [
        id, customer_id, midtrans_order_id, amount, status, qris_url,
        JSON.stringify(cart_snapshot), order_id, expires_at,
      ],
    };
    const result = await pool.query(query);
    return result.rows[0];
  },

  async findPaymentById(id) {
    const query = {
      text: 'SELECT * FROM payments WHERE id = $1',
      values: [id],
    };
    const result = await pool.query(query);
    return result.rows[0] || null;
  },

  async findById(id) {
    return this.findPaymentById(id);
  },

  async findPaymentByMidtransOrderId(midtransOrderId) {
    const query = {
      text: 'SELECT * FROM payments WHERE midtrans_order_id = $1',
      values: [midtransOrderId],
    };
    const result = await pool.query(query);
    return result.rows[0] || null;
  },

  async cleanTable() {
    await pool.query('TRUNCATE TABLE payments CASCADE');
  },
};

export default PaymentsTableTestHelper;