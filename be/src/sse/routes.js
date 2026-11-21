import express from 'express';
import { authenticateSse, subscribeDashboardSse } from './controller.js';

const router = express.Router();

router.get('/dashboard', authenticateSse, subscribeDashboardSse);

export default router;
