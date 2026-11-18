import Joi from 'joi';

export const menuItemsQuerySchema = Joi.object({
  category_id: Joi.string().uuid().optional(),
});
