import crypto from 'crypto';
import { response } from '../../../utils/index.js';
import orderRepositories from '../../orders/repositories/order-repositories.js';
import paymentRepositories from '../repositories/payment-repositories.js';
import sseBroker from '../../../sse/broker.js';

export const handleWebhook = async (req, res) => {
  const { order_id, transaction_status, gross_amount, signature_key, status_code } = req.validated;

  // Signature verification: SHA512(order_id + status_code + gross_amount + server_key)
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const expectedSignature = crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest('hex');

  if (signature_key !== expectedSignature) {
    return response(res, 400, 'Invalid signature', null);
  }

  const payment = await paymentRepositories.getByMidtransOrderId(order_id);
  if (!payment) return response(res, 404, 'Payment not found', null);

  // Map Midtrans status to internal status
  const statusMap = {
    settlement: 'paid',
    expire: 'expired',
    cancel: 'failed',
    deny: 'failed',
  };
  const internalStatus = statusMap[transaction_status] || 'failed';

  const pool = paymentRepositories.getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await paymentRepositories.updateStatus(client, payment.id, internalStatus);

    let createdOrder;
    // Create order only on settlement and only if not already created (idempotency)
    if (transaction_status === 'settlement' && !payment.order_id) {
      const { table_number, orderItemsData, total_price } = payment.cart_snapshot;

      createdOrder = await orderRepositories.createOrder(client, {
        customer_id: payment.customer_id,
        table_number,
        payment_reference: payment.midtrans_order_id,
        total_price,
      });

      for (const itemData of orderItemsData) {
        await orderRepositories.createOrderItem(client, {
          order_id: createdOrder.id,
          ...itemData,
        });
      }

      await paymentRepositories.setOrderId(client, payment.id, createdOrder.id);
    }

    await client.query('COMMIT');

    if (createdOrder) {
      const fullOrder = await orderRepositories.getOrderById(createdOrder.id);
      sseBroker.broadcast('new_order', fullOrder);
    }

    return response(res, 200, null, { status: 'acknowledged' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Webhook order creation failed:', err);
    return response(res, 500, 'Internal Server Error', null);
  } finally {
    client.release();
  }
};

export const getPaymentStatus = async (req, res) => {
  const { payment_id } = req.params;
  const customer_id = req.user.id;

  let payment;
  try {
    payment = await paymentRepositories.getById(payment_id);
  } catch (err) {
    if (err.code === '22P02') payment = null;
    else throw err;
  }

  if (!payment) return response(res, 404, 'Payment not found', null);
  if (payment.customer_id !== customer_id) return response(res, 403, 'Forbidden', null);

  return response(res, 200, null, {
    payment_id: payment.id,
    status: payment.status,
    order_id: payment.order_id || null,
  });
};
