import express from 'express';
import { viewLogs } from '../../controllers/logs/log.controller.js';
import { isAdmin } from '../../middleware/auth.js';

const router = express.Router();

// Get logs (admin only)
router.get('/', isAdmin, viewLogs);

export default router; 