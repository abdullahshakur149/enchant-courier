import express from 'express';
import { Order } from '../models/order.js';
import { broadcastNotification } from '../server.js';

const router = express.Router();

// Shopify fulfillment webhook
router.post("/fulfillment", express.json(), async (req, res) => {
    try {
        const fulfillmentData = req.body;
        console.log("📦 Fulfillment Received:", fulfillmentData);

        // Process each line item in the fulfillment
        const createdOrders = await Promise.all(fulfillmentData.line_items.map(async (item) => {
            // Calculate prices
            const itemPrice = parseFloat(item.price) || 0;
            const itemQuantity = parseInt(item.quantity) || 0;
            const itemTotalPrice = itemPrice * itemQuantity;

            // Extract relevant data from the webhook payload
            const orderData = {
                trackingNumber: fulfillmentData.tracking_number,
                courierType: fulfillmentData.tracking_company,
                status: 'Pending',
                invoicePayment: itemPrice,
                totalPrice: itemTotalPrice,
                productInfo: {
                    OrderNumber: fulfillmentData.order_id.toString(),
                    date: fulfillmentData.created_at,
                    CustomerName: `${fulfillmentData.destination.first_name} ${fulfillmentData.destination.last_name}`,
                    Address: `${fulfillmentData.destination.address1}${fulfillmentData.destination.address2 ? ', ' + fulfillmentData.destination.address2 : ''}, ${fulfillmentData.destination.city}, ${fulfillmentData.destination.zip}`,
                    OrderDetails: {
                        ProductName: item.name,
                        Quantity: item.quantity.toString(),
                        Price: itemPrice,
                        TotalPrice: itemTotalPrice
                    }
                },
                rawJson: {
                    ...fulfillmentData,
                    line_item: item // Store the specific line item data
                }
            };

            // Create new order
            const order = new Order(orderData);
            await order.save();

            // Broadcast notification about new order
            broadcastNotification({
                title: 'New Order Created',
                message: `Order #${orderData.trackingNumber} has been created for ${item.name} (${item.quantity} x ${itemPrice})`
            });

            return order;
        }));

        res.status(200).json({
            success: true,
            message: 'Orders created successfully',
            orders: createdOrders,
            totalOrders: createdOrders.length
        });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ success: false, message: 'Error processing webhook', error: error.message });
    }
});

export default router; 