import express from 'express';
const router = express.Router();
import { checkAuthenticated } from '../config/webAuth.js';
import { getMonthlyOrderStats } from "../controllers/orders/order.controller.js";
import { Order } from '../models/order.js';

// Authentication middleware
router.use(checkAuthenticated);

router.get('/', async (req, res) => {
    try {
        // Get monthly stats
        const stats = await getMonthlyOrderStats();

        // Get recent orders (last 10)
        const recentOrders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('updates');

        // Get courier distribution stats
        const courierStats = {
            postex: await Order.countDocuments({ courierType: 'postex' }),
            daewoo: await Order.countDocuments({ courierType: 'daewoo' }),
            trax: await Order.countDocuments({ courierType: 'trax' })
        };

        res.render('dashboard/dashboard', {
            user: req.user,
            stats,
            recentOrders,
            courierStats
        });
    } catch (err) {
        console.error("Error in dashboard route:", err);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
