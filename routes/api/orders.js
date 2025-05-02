import express from 'express';
import { getOrders, deliveredOrder, returnedOrder, verifyReturn, deleteOrder, updateOrder } from '../../controllers/orders/order.controller.js';
import {updateOrderStatuses} from '../../controllers/orders/cron.controller.js'

const router = express.Router();

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

router.get('/update-status', updateOrderStatuses)
export default router;