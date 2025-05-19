import express from 'express';
import { getOrders, deliveredOrder, returnedOrder, verifyReturn, deleteOrder, updateOrder, remarksOrder } from '../../controllers/orders/order.controller.js';
import { updateOrderStatuses } from '../../controllers/orders/cron.controller.js'
import { Order } from '../../models/order.js';
import twilio from 'twilio';

const router = express.Router();

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

// Parse JSON request bodies
router.use(express.json());

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const result = await getOrders(page, limit);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching orders'
        });
    }
});

router.get('/delivered', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const result = await deliveredOrder(page, limit);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching delivered orders'
        });
    }
});

router.get('/returned', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const result = await returnedOrder(page, limit);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching returned orders'
        });
    }
});

router.post('/verify-return', verifyReturn);

router.delete('/:orderId', deleteOrder);

router.put('/:orderId', updateOrder);

router.put('/remarks/:orderId', remarksOrder);


// cronejob\
// cronejob

router.get('/update-status', updateOrderStatuses)

// Test WhatsApp notification
// router.get('/test-whatsapp/:trackingNumber', async (req, res) => {
//     try {
//         const order = await Order.findOne({ trackingNumber: req.params.trackingNumber });

//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Order not found'
//             });
//         }

//         // Send WhatsApp notification
//         await twilioClient.messages.create({
//             from: 'whatsapp:+14155238886',
//             body: `Order Delivered! 🎉\n\nTracking Number: ${order.trackingNumber}\nCourier: ${order.courierType}\nCustomer: ${order.productInfo?.CustomerName || 'N/A'}\nAddress: ${order.productInfo?.Address || 'N/A'}\nDelivered at: ${new Date().toLocaleString()}`,
//             to: 'whatsapp:+923349196224'
//         });

//         res.json({
//             success: true,
//             message: 'WhatsApp notification sent successfully'
//         });
//     } catch (error) {
//         console.error('Error sending WhatsApp notification:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error sending WhatsApp notification',
//             error: error.message
//         });
//     }
// });

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'operational',
        message: 'Orders API is healthy',
        timestamp: new Date()
    });
});

export default router;