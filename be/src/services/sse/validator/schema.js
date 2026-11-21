import Joi from 'joi';

export const orderStatusParamsSchema = Joi.object({
  order_id: Joi.string().uuid().required(),
});