import express from 'express';
import validate from '../../../middlewares/validate.js';
import authenticate from '../../../middlewares/authenticate.js';
import { handleWebhook, getPaymentStatus } from '../controller/payment-controller.js';
import { webhookPaymentSchema } from '../validator/schema.js';

const router = express.Router();

router.post('/webhook', validate(webhookPaymentSchema), handleWebhook);
router.get('/:payment_id/status', authenticate, getPaymentStatus);

export default router;
