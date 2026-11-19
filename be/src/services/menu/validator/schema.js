import Joi from 'joi';

export const menuItemsQuerySchema = Joi.object({
  category_id: Joi.string().uuid().optional(),
});

export const createMenuItemSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().min(1).max(500).required(),
  price: Joi.number().integer().positive().max(999999999).required(),
  category_id: Joi.string().uuid().required(),
});

export const updateMenuItemSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().min(1).max(500).optional(),
  price: Joi.number().integer().positive().max(999999999).optional(),
  category_id: Joi.string().uuid().optional(),
  is_available: Joi.boolean().optional(),
});
