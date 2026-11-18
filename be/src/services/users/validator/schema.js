import Joi from 'joi';

export const registerPayloadSchema = Joi.object({
  name: Joi.string().max(100).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(72).required().messages({
    'string.min': 'Password must be at least 8 characters',
  }),
  confirmPassword: Joi.any()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
    }),
});
