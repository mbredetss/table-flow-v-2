import Joi from 'joi';

export const createOrderSchema = Joi.object({
  table_number: Joi.string().trim().min(1).max(20).required(),
  payment_reference: Joi.string().trim().min(1).max(255).required(),
  items: Joi.array()
    .min(1)
    .items(
      Joi.object({
        menu_item_id: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).max(99).required(),
        note: Joi.string().max(255).allow('', null).optional(),
      })
    )
    .required(),
});
