import express from 'express';
const router = express.Router();
import { checkAuthenticated } from '../config/webAuth.js';
import { Order } from '../models/order.js';
import User from '../models/user.js';
import {
    updateSystemSettings,
    getUserSettings,
    addUser,
    updateUser,
    deleteUser,
    getSystemStatus
} from '../controllers/settings/settings.controller.js';

// Function to get order statistics
const getOrderStatistics = async () => {
    try {
        const totalOrders = await Order.countDocuments();
        const deliveredOrders = await Order.countDocuments({ isDelivered: true });
        const returnedOrders = await Order.countDocuments({ isReturned: true });
        const pendingOrders = await Order.countDocuments({
            isDelivered: false,
            isReturned: false
        });        // const order = await Order.find({trackingNumber: '27124450427978'});
        // console.log(order);

        return {
            total: totalOrders,
            delivered: deliveredOrders,
            returned: returnedOrders,
            pending: pendingOrders
        };
    } catch (error) {
        console.error('Error getting order statistics:', error);
        throw error;
    }
};

// Authentication middleware
router.use(checkAuthenticated);

// Dashboard main route
router.get('/', async (req, res) => {
    try {
        const orderStats = await getOrderStatistics();
        const recentOrders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(10)
            .select('trackingNumber courierType flyerId customer_name address status_record delivered_at returned_at last_tracking_update latest_courier_status');

        // Process recent orders
        for (let order of recentOrders) {
            // Initialize status_record if it doesn't exist
            if (!order.status_record) {
                order.status_record = [];
            }

            // Get latest status
            const latestStatus = order.status_record.length > 0
                ? order.status_record[order.status_record.length - 1]
                : order.latest_courier_status || "Not Available";

            order.latestStatus = latestStatus;
        }

        res.render('dashboard/dashboard', {
            user: req.user,
            orderStats,
            recentOrders,
            path: '/dashboard'
        });
    } catch (error) {
        console.error('Error in dashboard route:', error);
        req.flash('error', error.message || 'Please try again later.');
        res.status(500).render('error', {
            message: error.message || 'An unexpected error occurred. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error : {}
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

// System status route
router.get('/system-status', getSystemStatus);

export default router;
