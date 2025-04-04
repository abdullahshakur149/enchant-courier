import express from 'express';
import { submitOrder, getOrders, getCompletedOrders, getReturnedOrders, checkReturnedOrder } from "../controllers/orders/order.controller.js";
import { checkAuthenticated } from '../config/webAuth.js';
import axios from 'axios';


const router = express.Router();

// submit order api
router.post('/submit-order', submitOrder);

// rendering the check-return page in dashboard 
router.get('/check-return', checkAuthenticated, (req, res) => {
    res.render('dashboard/return')
})
router.post('/verify-returns', checkReturnedOrder)


router.get('/orders', checkAuthenticated, async (req, res) => {
    try {
        const { trackingData } = await getOrders();

        if (!trackingData || trackingData.length === 0) {
            console.warn("No orders found.");
        }

        res.render('dashboard/orders', { trackingData });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Server error while fetching orders.");
    }
});



// getting completed orders in the dashboard
router.get('/completed-orders', checkAuthenticated, async (req, res) => {
    try {
        const completedOrders = await getCompletedOrders();
        res.render('dashboard/completeOrder.ejs', { completedOrders })
    } catch (error) {

    }
})

// getting the returned orders in the dashboard
router.get('/returned-orders', checkAuthenticated, async (req, res) => {
    try {
        const returnedOrders = await getReturnedOrders();
        // console.log(returnedOrders)
        res.render('dashboard/returnedOrder.ejs', { returnedOrders })
    } catch (error) {

    }
})




export default router;
