import express from 'express';
import { Order } from '../models/order.js';
import { broadcastNotification } from '../server.js';
import mongoose from 'mongoose';

const router = express.Router();

// Test endpoint to verify route is working
router.get("/test", (req, res) => {
    console.log("Test endpoint hit!");
    res.json({ message: "Webhook route is working!" });
});

// Shopify fulfillment webhook
router.post("/fulfillment", express.json(), async (req, res) => {
    console.log("Webhook endpoint hit!"); // Basic log to verify endpoint is hit

    try {
        const fulfillmentData = req.body;
        // console.log("📦 Fulfillment Received:", fulfillmentData);
        // test

        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            console.log("Database not connected!");
            throw new Error('Database not connected');
        }

        // Create order with just tracking information
        const orderData = {
            trackingNumber: fulfillmentData.tracking_number,
            courierType: fulfillmentData.tracking_company,
            status: 'Pending'
        };

        console.log('Creating order with data:', orderData);

        try {
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
            console.log('Order instance created, attempting to save...');

            const savedOrder = await order.save();
            console.log('Order saved successfully:', savedOrder._id);

            // Verify the order was actually saved
            const verifiedOrder = await Order.findById(savedOrder._id);
            if (!verifiedOrder) {
                throw new Error('Order was not saved properly');
            }
            console.log('Order verified in database:', verifiedOrder._id);

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
        } catch (dbError) {
            console.error('Database operation error:', {
                message: dbError.message,
                code: dbError.code,
                name: dbError.name,
                stack: dbError.stack
            });
            throw dbError;
        }
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