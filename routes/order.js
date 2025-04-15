import express from 'express';
import { submitOrder, getOrders, updateOrder, deleteOrder } from "../controllers/orders/order.controller.js";
import { updateOrderStatuses } from '../controllers/orders/cron.controller.js';
import { checkAuthenticated } from '../config/webAuth.js';
import { CompletedOrder } from '../models/order.js';

const router = express.Router();

router.post('/submit-order', submitOrder);

// change done
router.get('/update-status', (req, res) => {
    console.log('Update status route hit');
    console.log('Headers:', req.headers);

    if (!process.env.SCHEDULER_SECRET) {
        console.error('SCHEDULER_SECRET is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (req.headers['x-scheduler-secret'] !== process.env.SCHEDULER_SECRET) {
        console.log('Invalid or missing scheduler secret');
        return res.status(403).json({ error: 'Unauthorized' });
    }

    console.log('Starting order status update...');
    updateOrderStatuses(req, res);
});

router.get('/orders', checkAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const { trackingData, pagination } = await getOrders(page, limit);

        if (!trackingData || trackingData.length === 0) {
            console.warn("No orders found.");
        }

        res.render('dashboard/orders', { trackingData, pagination });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Server error while fetching orders.");
    }
});

// New route for delivered orders
router.get('/delivered', checkAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Get delivered orders
        const deliveredOrders = await CompletedOrder.find({})
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalOrders = await CompletedOrder.countDocuments();

        const trackingData = deliveredOrders.map(order => ({
            _id: order._id,
            trackingNumber: order.trackingNumber,
            courierType: order.courierType,
            flyerId: order.flyerId,
            productInfo: order.productInfo || {},
            trackingResponse: {
                status: order.latestStatus || "Delivered"
            }
        }));

        const pagination = {
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders,
            limit
        };

        res.render('dashboard/delivered', { trackingData, pagination });
    } catch (error) {
        console.error("Error fetching delivered orders:", error);
        res.status(500).send("Server error while fetching delivered orders.");
    }
});

router.post('/update-order/:id', checkAuthenticated, updateOrder);

router.delete('/delete-order/:id', checkAuthenticated, deleteOrder);

export default router;
