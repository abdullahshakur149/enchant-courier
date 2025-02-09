import express from 'express';
import { submitOrder, getOrders } from "../controllers/orders/order.controller.js";
import { checkAuthenticated } from '../config/webAuth.js';


const router = express.Router();

router.post('/submit-order', submitOrder);

router.get('/orders', checkAuthenticated, async (req, res) => {
    try {
        const orders = await getOrders();
        res.render('dashboard/orders', { orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Server error");
    }
});

export default router;
