import express from 'express';
import { submitOrder, getOrders, updateOrder, getCompletedOrders, getReturnedOrders } from "../controllers/orders/order.controller.js";
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

router.get('/completed-orders', checkAuthenticated, async (req, res) => {
    try {
        const completedOrders = await getCompletedOrders();
        // console.log(completedOrders)
        res.render('dashboard/completeOrder.ejs', { completedOrders })
    } catch (error) {

    }
})

router.get('/returned-orders', checkAuthenticated, async (req, res) => {
    try {
        const returnedOrders = await getReturnedOrders();
        console.log(returnedOrders)
        res.render('dashboard/returnedOrder.ejs', { returnedOrders })
    } catch (error) {

    }
})

export default router;
