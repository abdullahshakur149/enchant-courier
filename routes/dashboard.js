import express from 'express';
const router = express.Router();
import { checkAuthenticated } from '../config/webAuth.js';
import { getMonthlyStats } from "../controllers/orders/order.controller.js";
import { Order } from '../models/order.js';
import User from '../models/user.js';
import {
    updateSystemSettings,
    getUserSettings,
    addUser,
    updateUser,
    deleteUser
} from '../controllers/settings/settings.controller.js';

// Authentication middleware
router.use(checkAuthenticated);

// Dashboard main route
router.get('/', async (req, res) => {
    try {

        const trax = await Order.countDocuments({
            isDelivered: true,
            isReturned: true,
            courierType: 'trax'
        });
        const daewoo = await Order.countDocuments({
            isDelivered: true,
            isReturned: true,
            courierType: 'daewoo'
        });
        const postex = await Order.countDocuments({
            isDelivered: true,
            isReturned: true,
            courierType: 'postex'
        });
        console.log("Delivered Orders:", trax, daewoo, postex);

        const statsResponse = await getMonthlyStats();
        if (!statsResponse.success) {
            throw new Error(statsResponse.message || 'Failed to get monthly stats');
        }

        const recentOrders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(10);

        // No need to fetch OrderUpdate anymore since updates are now embedded in the Order model
        for (let order of recentOrders) {
            const latestStatus = order.status_record && order.status_record.length > 0
                ? order.status_record[order.status_record.length - 1]
                : null;
            order.latestStatus = latestStatus;
        }

        res.render('dashboard/dashboard', {
            user: req.user,
            stats: statsResponse.stats,
            recentOrders,
            path: '/dashboard'
        });
    } catch (err) {
        console.error("Error in dashboard route:", err);
        res.status(500).render('error', {
            message: 'Internal Server Error',
            error: err.message
        });
    }
});

// Settings routes
router.get('/settings', async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.render('dashboard/settings', {
            user: req.user,
            users: users,
            path: '/dashboard/settings'
        });
    } catch (err) {
        console.error("Error in settings route:", err);
        res.status(500).render('error', {
            message: 'Internal Server Error',
            error: err.message
        });
    }
});

// User management routes
router.post('/settings/add-user', addUser);
router.post('/settings/update-user/:id', updateUser);
router.post('/settings/delete-user/:id', deleteUser);

// System settings route
router.post('/settings/update-system', updateSystemSettings);

export default router;
