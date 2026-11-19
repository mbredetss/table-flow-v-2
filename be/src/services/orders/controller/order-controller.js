import { response } from '../../../utils/index.js';
import menuRepositories from '../../menu/repositories/menu-repositories.js';
import orderRepositories from '../repositories/order-repositories.js';

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

  // Open database transaction
  const pool = orderRepositories.getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const createdOrder = await orderRepositories.createOrder(client, {
      customer_id,
      table_number,
      payment_reference,
      total_price,
    });

    for (const itemData of orderItemsData) {
      await orderRepositories.createOrderItem(client, {
        order_id: createdOrder.id,
        ...itemData,
      });
    }

    await client.query('COMMIT');

    return response(res, 201, null, {
      order_id: createdOrder.id,
      status: createdOrder.status,
      total_price: createdOrder.total_price,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
