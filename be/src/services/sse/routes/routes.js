import express from 'express';
import {
  subscribeDashboardSse,
  subscribeOrderStatusSse,
} from '../controller/controller.js';
import authenticateSse from '../../../middlewares/authenticateQuery.js';
import authorize from '../../../middlewares/authorize.js';
import { orderStatusParamsSchema } from '../validator/schema.js';
import validateParams from '../../../middlewares/validateParams.js';

const router = express.Router();

router.get('/dashboard', authenticateSse,authorize('cashier', 'admin'), subscribeDashboardSse);
router.get('/orders/:order_id/status', authenticateSse, authorize('customer'), validateParams(orderStatusParamsSchema), subscribeOrderStatusSse);

export default router;
