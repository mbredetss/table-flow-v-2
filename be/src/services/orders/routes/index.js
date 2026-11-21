import express from 'express';
import authenticate from '../../../middlewares/authenticate.js';
import authorize from '../../../middlewares/authorize.js';
import validate from '../../../middlewares/validate.js';
import {
  createOrder,
  getOrderById,
  getActiveOrders,
  updateOrderStatus,
} from '../controller/order-controller.js';
import { createOrderSchema, updateOrderStatusSchema } from '../validator/schema.js';

const router = express.Router();

router.get('/', authenticate, authorize('cashier', 'admin'), getActiveOrders);
router.patch('/:id/status', authenticate, authorize('cashier', 'admin'), validate(updateOrderStatusSchema), updateOrderStatus);
router.post('/', authenticate, authorize('customer'), validate(createOrderSchema), createOrder);
router.get('/:id', authenticate, authorize('customer'), getOrderById);

export default router;
