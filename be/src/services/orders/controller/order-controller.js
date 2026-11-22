import { response } from '../../../utils/index.js';
import menuRepositories from '../../menu/repositories/menu-repositories.js';
import midtransClient from '../../payments/payment gateway/mid-trans-client.js';
import paymentRepositories from '../../payments/repositories/payment-repositories.js';
import orderRepositories from '../repositories/order-repositories.js';
import sseBroker from '../../sse/broker/broker.js';

export const createOrder = async (req, res) => {
  const customer_id = req.user.id;
  const { table_number, payment_reference, items } = req.validated;

  // Verify payment reference uniqueness
  const existingOrder = await orderRepositories.findByPaymentReference(payment_reference);
  if (existingOrder) return response(res, 409, 'Payment reference already used', null);

  // Validate items and check availability
  const orderItemsData = [];
  let total_price = 0;

  for (const item of items) {
    let menuItem;
    try {
      menuItem = await menuRepositories.getItemById(item.menu_item_id);
    } catch (err) {
      if (err.code === '22P02') menuItem = null;
      else throw err;
    }

    if (!menuItem) return response(res, 404, 'Menu item not found', null);

    if (!menuItem.is_available) return response(res, 422, `Item '${menuItem.name}' is no longer available.`, null);

    const unit_price = menuItem.price;
    total_price += unit_price * item.quantity;

    orderItemsData.push({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      note: item.note,
      unit_price,
    });
  }

  // Build Midtrans order ID
  const midtrans_order_id = `TF-${crypto.randomUUID()}`;

  // Call Midtrans Core API
  let qris_url;
  try {
    const chargeResponse = await midtransClient.charge({
      payment_type: 'qris',
      transaction_details: {
        order_id: midtrans_order_id,
        gross_amount: total_price,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      qris_url = chargeResponse.actions[0].url;
    } else {
      qris_url = chargeResponse.actions[1].url;
    }
  } catch {
    return response(res, 502, 'Payment gateway is unreachable. Please try again.', null);
  }

  const expires_at = new Date(Date.now() + 15 * 60 * 1000);

  const cart_snapshot = { table_number, orderItemsData, total_price };

  const payment = await paymentRepositories.insert({
    customer_id,
    midtrans_order_id,
    amount: total_price,
    qris_url,
    cart_snapshot,
    expires_at,
  });

  return response(res, 201, null, {
    payment_id: payment.id,
    qris_url,
    expires_at: payment.expires_at,
  });
};

export const getOrderById = async (req, res) => {
  const { id } = req.params;
  const customer_id = req.user.id;

  let order;
  try {
    order = await orderRepositories.getOrderById(id);
  } catch (err) {
    if (err.code === '22P02') order = null;
    else throw err;
  }

  if (!order) return response(res, 404, 'Order not found', null);

  if (order.customer_id !== customer_id) return response(res, 403, 'Forbidden', null);

  return response(res, 200, null, order);
};

export const getOrderHistory = async (req, res) => {
  const customer_id = req.user.id;
  const { page, limit } = req.validatedQuery;

  const { data, total } = await orderRepositories.getCustomerHistory(customer_id, page, limit);

  return res.status(200).json({
    status: 'success',
    data,
    total,
    page,
    limit,
  });
};

export const getActiveOrders = async (req, res) => {
  const orders = await orderRepositories.getActiveOrders();
  const grouped = {
    pending: [],
    preparing: [],
    ready: [],
  };

  for (const order of orders) {
    if (grouped[order.status]) {
      grouped[order.status].push(order);
    }
  }

  return response(res, 200, null, grouped);
};

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.validated;

  let order;
  try {
    order = await orderRepositories.getOrderById(id);
  } catch (err) {
    if (err.code === '22P02') order = null;
    else throw err;
  }

  if (!order) return response(res, 404, 'Order not found', null);

  const ALLOWED_TRANSITIONS = {
    pending: 'preparing',
    preparing: 'ready',
    ready: 'completed',
  };

  if (ALLOWED_TRANSITIONS[order.status] !== status) return response(res, 422, `Invalid status transition from '${order.status}' to '${status}'.`);

  await orderRepositories.updateOrderStatus(id, status);
  const updatedOrder = await orderRepositories.getOrderById(id);

  const payload = {
    order_id: id,
    new_status: status,
    updated_at: updatedOrder.updated_at,
  };

  sseBroker.broadcast('order_status_updated', payload);
  sseBroker.sendToOrder(id, 'order_status_updated', payload);

  if (status === 'completed') {
    sseBroker.sendToOrder(id, 'order_completed', { order_id: id });
  }

  return response(res, 200, null, updatedOrder);
};

