import express from 'express';
import { Order } from '../models/order.js';
import { broadcastNotification } from '../server.js';

const router = express.Router();

// Shopify fulfillment webhook
router.post("/fulfillment", express.json(), async (req, res) => {
    try {
        const fulfillmentData = req.body;
        console.log("📦 Fulfillment Received:", fulfillmentData);

        if (!fulfillmentData.line_items || !Array.isArray(fulfillmentData.line_items)) {
            throw new Error('No line items found in fulfillment data');
        }

        // Process each line item in the fulfillment
        const createdOrders = await Promise.all(fulfillmentData.line_items.map(async (item) => {
            try {
                // Calculate prices
                const itemPrice = parseFloat(item.price) || 0;
                const itemQuantity = parseInt(item.quantity) || 0;
                const itemTotalPrice = itemPrice * itemQuantity;

                console.log('Processing item:', {
                    name: item.name,
                    price: itemPrice,
                    quantity: itemQuantity,
                    totalPrice: itemTotalPrice
                });

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
                        line_item: item
                    }
                };

                console.log('Creating order with data:', JSON.stringify(orderData, null, 2));

                // Check if order already exists
                const existingOrder = await Order.findOne({
                    trackingNumber: orderData.trackingNumber,
                    'productInfo.OrderDetails.ProductName': orderData.productInfo.OrderDetails.ProductName
                });

                if (existingOrder) {
                    console.log('Order already exists:', existingOrder._id);
                    return existingOrder;
                }

                // Create new order
                const order = new Order(orderData);
                const savedOrder = await order.save();
                console.log('Order created successfully:', savedOrder._id);

                // Broadcast notification about new order
                broadcastNotification({
                    title: 'New Order Created',
                    message: `Order #${orderData.trackingNumber} has been created for ${item.name} (${item.quantity} x ${itemPrice})`
                });

                return savedOrder;
            } catch (itemError) {
                console.error('Error processing line item:', {
                    error: itemError.message,
                    stack: itemError.stack,
                    item: item
                });
                throw itemError;
            }
        }));

        console.log('All orders created successfully:', createdOrders.length);

        res.status(200).json({
            success: true,
            message: 'Orders created successfully',
            orders: createdOrders,
            totalOrders: createdOrders.length
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
            error: error.message,
            details: error.stack
        });
    }
});

export default router; 