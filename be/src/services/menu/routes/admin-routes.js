import express from 'express';
import { uploadSingle } from '../upload/upload.js';
import {
  getAdminItems,
  createMenuItem,
  updateMenuItem,
  toggleAvailability,
  deleteMenuItem,
} from '../controller/menu-controller.js';

const router = express.Router();

router.get('/items', getAdminItems);
router.post('/items', uploadSingle('photo'), createMenuItem);
router.patch('/items/:id/availability', toggleAvailability);
router.patch('/items/:id', uploadSingle('photo'), updateMenuItem);
router.delete('/items/:id', deleteMenuItem);

export default router;
