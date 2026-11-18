import express from 'express';
import { getCategories, getItems, getItemById } from '../controller/menu-controller.js';
import validateQuery from '../../../middlewares/validateQuery.js';
import { menuItemsQuerySchema } from '../validator/schema.js';

const router = express.Router();

router.get('/categories', getCategories);
router.get('/items', validateQuery(menuItemsQuerySchema), getItems);
router.get('/items/:id', getItemById);

export default router;
