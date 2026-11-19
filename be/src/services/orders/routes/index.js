import express from 'express';
import validate from '../../../middlewares/validate.js';
import { createOrder, getOrderById } from '../controller/order-controller.js';
import { createOrderSchema } from '../validator/schema.js';

const router = express.Router();

router.post('/', validate(createOrderSchema), createOrder);
router.get('/:id', getOrderById);

export default router;
