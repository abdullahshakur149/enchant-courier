import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { Log } from '../models/log.js';

const router = express.Router();

// Get logs page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Get query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Build filter conditions
        const filter = {};
        if (req.query.startDate) {
            filter.timestamp = { ...filter.timestamp, $gte: new Date(req.query.startDate) };
        }
        if (req.query.endDate) {
            filter.timestamp = { ...filter.timestamp, $lte: new Date(req.query.endDate) };
        }
        if (req.query.actionType) {
            filter.action = req.query.actionType;
        }
        if (req.query.userId) {
            filter.userId = req.query.userId;
        }

        // Get logs with pagination and populate performedBy
        const logs = await Log.find(filter)
            .populate('performedBy', 'username')
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await Log.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        // Format logs for display
        const formattedLogs = logs.map(log => ({
            ...log.toObject(),
            details: formatLogDetails(log)
        }));

        // Render the page with logs data
        res.render('logs/index', {
            title: 'System Logs',
            logs: formattedLogs,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                total: total
            }
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        req.flash('error', 'Failed to fetch logs');
        res.render('logs/index', {
            title: 'System Logs',
            logs: [],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                total: 0
            }
        });
    }
});

// Get logs API endpoint
router.get('/api/logs', isAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Build filter conditions
        const filter = {};
        if (req.query.startDate) {
            filter.timestamp = { ...filter.timestamp, $gte: new Date(req.query.startDate) };
        }
        if (req.query.endDate) {
            filter.timestamp = { ...filter.timestamp, $lte: new Date(req.query.endDate) };
        }
        if (req.query.actionType) {
            filter.action = req.query.actionType;
        }
        if (req.query.userId) {
            filter.userId = req.query.userId;
        }

        // Get logs with pagination and populate performedBy
        const logs = await Log.find(filter)
            .populate('performedBy', 'username')
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await Log.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        // Format logs for display
        const formattedLogs = logs.map(log => ({
            ...log.toObject(),
            details: formatLogDetails(log)
        }));

        res.json({
            logs: formattedLogs,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                total: total
            }
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Helper function to format log details
function formatLogDetails(log) {
    if (!log.details) return 'N/A';

    switch (log.entity) {
        case 'order':
            let orderDetails = [];
            if (log.details.trackingNumber) {
                orderDetails.push(`Tracking #${log.details.trackingNumber}`);
            }
            if (log.details.flyerId) {
                orderDetails.push(`Flyer #${log.details.flyerId}`);
            }
            if (log.details.status) {
                orderDetails.push(`Status: ${log.details.status}`);
            }
            if (log.details.courierType) {
                orderDetails.push(`Courier: ${log.details.courierType}`);
            }
            if (log.details.productInfo) {
                if (log.details.productInfo.CustomerName) {
                    orderDetails.push(`Customer: ${log.details.productInfo.CustomerName}`);
                }
                if (log.details.productInfo.OrderDetails) {
                    orderDetails.push(`Product: ${log.details.productInfo.OrderDetails.ProductName}`);
                    orderDetails.push(`Quantity: ${log.details.productInfo.OrderDetails.Quantity}`);
                }
            }
            return orderDetails.length > 0 ? orderDetails.join(' | ') : JSON.stringify(log.details, null, 2);
        case 'user':
            if (log.details.username) {
                return `User: ${log.details.username}`;
            } else if (log.details.role) {
                return `Role: ${log.details.role}`;
            }
            break;
        case 'system':
            if (typeof log.details === 'object') {
                return JSON.stringify(log.details, null, 2);
            }
            break;
    }

    return typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details;
}

export default router; 