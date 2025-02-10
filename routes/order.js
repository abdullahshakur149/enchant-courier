import express from 'express';
import { submitOrder, getOrders, updateOrder } from "../controllers/orders/order.controller.js";
import { checkAuthenticated } from '../config/webAuth.js';


const router = express.Router();

router.post('/submit-order', submitOrder);
router.put('/update-order', updateOrder)

router.get('/orders', checkAuthenticated, async (req, res) => {
    try {
        const { orders, information } = await getOrders();
        res.render('dashboard/orders', { orders, information });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Server error");
    }
});

export default router;
