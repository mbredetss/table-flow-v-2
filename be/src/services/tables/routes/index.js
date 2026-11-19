import express from 'express';
import {
  getTables,
  createTable,
  deleteTable,
  getTableQrCode,
} from '../controller/table-controller.js';

const router = express.Router();

router.get('/', getTables);
router.post('/', createTable);
router.get('/:id/qrcode', getTableQrCode);
router.delete('/:id', deleteTable);

export default router;
