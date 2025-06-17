import express from 'express';
import { viewLogs } from '../../controllers/logs/log.controller.js';
import { isAdmin, isAuthenticated } from '../../middleware/auth.js';
import { Log } from '../../models/log.js';

const router = express.Router();

// Get logs (admin only)
router.get('/', isAdmin, viewLogs);

// Get paginated system logs
router.get('/paginated', isAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Build filter object based on query parameters
        const filter = {};
        if (req.query.action) filter.action = req.query.action;
        if (req.query.entity) filter.entity = req.query.entity;
        if (req.query.startDate && req.query.endDate) {
            filter.timestamp = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }

        const logs = await Log.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate('performedBy', 'username');

        const totalLogs = await Log.countDocuments(filter);

        res.json({
            logs,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalLogs / limit),
                totalLogs,
                limit
            }
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ message: 'Error fetching logs' });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'operational',
        message: 'Logs API is healthy',
        timestamp: new Date()
    });
});

export default router; 