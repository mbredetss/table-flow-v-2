import express from 'express';
import authenticate from '../../../middlewares/authenticate.js';
import authorize from '../../../middlewares/authorize.js';
import validate from '../../../middlewares/validate.js';
import validateQuery from '../../../middlewares/validateQuery.js';
import {
  createOrder,
  getOrderById,
  getActiveOrders,
  updateOrderStatus,
  getOrderHistory,
} from '../controller/order-controller.js';
import { createOrderSchema, updateOrderStatusSchema, orderHistoryQuerySchema } from '../validator/schema.js';

const router = express.Router();

router.get('/', authenticate, authorize('cashier', 'admin'), getActiveOrders);
router.get('/history', authenticate, authorize('customer'), validateQuery(orderHistoryQuerySchema), getOrderHistory);
router.patch('/:id/status', authenticate, authorize('cashier', 'admin'), validate(updateOrderStatusSchema), updateOrderStatus);
router.post('/', authenticate, authorize('customer'), validate(createOrderSchema), createOrder);
router.get('/:id', authenticate, authorize('customer'), getOrderById);

export default router;
