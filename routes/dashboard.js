import express from 'express';
const router = express.Router();
import { checkAuthenticated } from '../config/webAuth.js';
import { getMonthlyStats } from "../controllers/orders/order.controller.js";
import { Order } from '../models/order.js';

// Authentication middleware
router.use(checkAuthenticated);

router.get('/', async (req, res) => {
    try {
        // Get monthly stats
        const statsResponse = await getMonthlyStats();
        if (!statsResponse.success) {
            throw new Error(statsResponse.message || 'Failed to get monthly stats');
        }

        // Get recent orders (last 10)
        const recentOrders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(10);

        res.render('dashboard/dashboard', {
            user: req.user,
            stats: statsResponse.stats,
            recentOrders
        });
    } catch (err) {
        console.error("Error in dashboard route:", err);
        res.status(500).render('error', {
            message: 'Internal Server Error',
            error: err.message
        });
    }
});

export default router;
