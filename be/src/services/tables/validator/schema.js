import Joi from 'joi';

export const createTableSchema = Joi.object({
  table_number: Joi.string().trim().min(1).max(20).required(),
});
