import express from 'express';
import { login, refreshToken, logout } from '../controller/authentication-controller.js';
import validate from '../../../middlewares/validate.js';
import { loginPayloadSchema } from '../validator/schema.js';

const router = express.Router();

router.post('/login', validate(loginPayloadSchema), login);
router.post('/refresh', refreshToken);
router.delete('/logout', logout);

export default router;
