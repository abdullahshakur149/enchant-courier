import express from 'express';
import { submitOrder, getOrders, getCompletedOrders, getReturnedOrders, updateOrder, deleteOrder } from "../controllers/orders/order.controller.js";
import { checkAuthenticated } from '../config/webAuth.js';
import axios from 'axios';


const router = express.Router();

router.post('/submit-order', submitOrder);


router.get('/order/check-return', checkAuthenticated, (req, res) => {
    res.render('dashboard/verify-returns.ejs');
});



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

router.post('/update-order', checkAuthenticated, updateOrder)

router.delete('/delete-order/:id', checkAuthenticated, deleteOrder);


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
