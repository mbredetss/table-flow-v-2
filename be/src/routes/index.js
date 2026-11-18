import express from 'express';
import users from '../services/users/routes/index.js';
import authentications from '../services/authentications/routes/index.js';
import menu from '../services/menu/routes/index.js';

const router = express.Router();

router.use('/users', users);
router.use('/auth', authentications);
router.use('/menu', menu);

export default router;
