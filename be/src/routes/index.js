import express from 'express';
import users from '../services/users/routes/index.js';
import authentications from '../services/authentications/routes/index.js';
import menu from '../services/menu/routes/index.js';
import adminMenu from '../services/menu/routes/admin-routes.js';
import adminTables from '../services/tables/routes/index.js';
import orders from '../services/orders/routes/index.js';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';

const router = express.Router();

router.use('/users', users);
router.use('/auth', authentications);
router.use('/menu', menu);
router.use('/orders', authenticate, authorize('customer'), orders);

router.use('/admin', authenticate, authorize('admin'));
router.use('/admin/menu', adminMenu);
router.use('/admin/tables', adminTables);

export default router;
