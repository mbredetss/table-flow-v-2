import crypto from 'crypto';
import { response } from '../../../utils/index.js';
import orderRepositories from '../../orders/repositories/order-repositories.js';
import sseBroker from '../broker/broker.js';;

export const subscribeDashboardSse = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const clientId = crypto.randomUUID();
  sseBroker.addClient(clientId, res);

  res.on('error', () => {
    sseBroker.removeClient(clientId);
  });

  res.write(': connected\n\n');

  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseBroker.removeClient(clientId);
  });
};

export const subscribeOrderStatusSse = async (req, res) => {
  const { order_id } = req.validatedParams;

  const order = await orderRepositories.getOrderById(order_id);

  if (!order) return response(res, 404, 'Order not found', null);

  if (order.customer_id !== req.user.id) return response(res, 403, 'Forbidden', null);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  sseBroker.addOrderClient(order_id, res);

  res.on('error', () => {
    sseBroker.removeOrderClient(order_id, res);
  });

  res.write(': connected\n\n');

  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
      sseBroker.removeOrderClient(order_id, res);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseBroker.removeOrderClient(order_id, res);
  });
};
