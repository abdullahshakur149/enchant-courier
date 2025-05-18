import express from 'express';
import { viewLogs } from '../../controllers/logs/log.controller.js';
import { isAdmin } from '../../middleware/auth.js';

const router = express.Router();

// Get logs (admin only)
router.get('/', isAdmin, viewLogs);

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'operational',
        message: 'Logs API is healthy',
        timestamp: new Date()
    });
});

export default router; 