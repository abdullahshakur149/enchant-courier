import express from 'express';
import { Order } from '../models/order.js';
import { broadcastNotification } from '../server.js';

const router = express.Router();

// Shopify fulfillment webhook
router.post("/fulfillment", express.json(), async (req, res) => {
    try {
        const fulfillmentData = req.body;
        console.log("📦 Fulfillment Received:", fulfillmentData);

        // Create order with just tracking information
        const orderData = {
            trackingNumber: fulfillmentData.tracking_number,
            courierType: fulfillmentData.tracking_company,
            status: 'Pending',
        };

        console.log('Creating order with data:', orderData);

        // Check if order already exists
        const existingOrder = await Order.findOne({
            trackingNumber: orderData.trackingNumber
        });

        if (existingOrder) {
            console.log('Order already exists:', existingOrder._id);
            return res.status(200).json({
                success: true,
                message: 'Order already exists',
                order: existingOrder
            });
        }

        // Create new order
        const order = new Order(orderData);
        const savedOrder = await order.save();
        console.log('Order created successfully:', savedOrder._id);

        // Broadcast notification about new order
        broadcastNotification({
            title: 'New Order Created',
            message: `New order created with tracking number ${orderData.trackingNumber}`
        });

        res.status(200).json({
            success: true,
            message: 'Order created successfully',
            order: savedOrder
        });
    } catch (error) {
        console.error('Error processing webhook:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({
            success: false,
            message: 'Error processing webhook',
            error: error.message
        });
    }
});

export default router; 