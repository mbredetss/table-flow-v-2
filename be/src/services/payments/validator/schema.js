import Joi from 'joi';

export const webhookPaymentSchema = Joi.object({
  order_id: Joi.string().required(),
  transaction_status: Joi.string()
    .valid('settlement', 'expire', 'cancel', 'deny')
    .required(),
  gross_amount: Joi.string().required(),
  signature_key: Joi.string().required(),
  status_code: Joi.string().optional(),
}).unknown(true);
