import express from 'express';
import { Order } from '../models/order.js';
import mongoose from 'mongoose';
import { Notification } from '../models/notification.js';

const router = express.Router();

// Test endpoint to verify route is working
router.get("/test", (req, res) => {
    console.log("Test endpoint hit!");
    res.json({ message: "Webhook route is working!" });
});

// Helper function to check database connection
const isDatabaseConnected = () => {
    return mongoose.connection.readyState === 1;
};

// Helper function to wait for database connection
const waitForDatabase = async (maxRetries = 5, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        if (isDatabaseConnected()) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    return false;
};

// Process webhook data
const processWebhook = async (fulfillment) => {
    try {
        // Find the order by tracking number
        const order = await Order.findOne({ trackingNumber: fulfillment.tracking_number });
        
        if (!order) {
            console.log(`Order not found for tracking number: ${fulfillment.tracking_number}`);
            return;
        }

        // Update order status
        order.isDelivered = true;
        order.delivered_at = new Date(fulfillment.created_at);
        order.status = 'Delivered';
        await order.save();

        // Create notification
        await Notification.create({
            type: 'order_delivered',
            title: 'Order Delivered',
            message: `Order #${order.trackingNumber} has been delivered`,
            orderId: order._id
        });

        console.log(`Successfully processed webhook for order: ${order.trackingNumber}`);
    } catch (error) {
        console.error('Error processing webhook data:', error);
        throw error;
    }
};

// Webhook endpoint
router.post('/fulfillment', async (req, res) => {
    console.log('Webhook endpoint hit!');
    console.log('📦 Fulfillment Received:', req.body);

    try {
        // Check database connection
        if (!isDatabaseConnected()) {
            console.log('Database not connected, waiting for connection...');
            const connected = await waitForDatabase();
            
            if (!connected) {
                throw new Error('Database not connected');
            }
        }

        // Process the webhook
        await processWebhook(req.body);
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

export default router; 