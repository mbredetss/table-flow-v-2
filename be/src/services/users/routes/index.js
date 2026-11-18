import express from 'express';
import { register } from '../controller/user-controller.js';
import validate from '../../../middlewares/validate.js';
import { registerPayloadSchema } from '../validator/schema.js';

const router = express.Router();

router.post('/', validate(registerPayloadSchema), register);

export default router;
