import express from 'express';
import { submitOrder, getOrders, updateOrder, getCompletedOrders, getReturnedOrders, checkReturnedOrder } from "../controllers/orders/order.controller.js";
import { checkAuthenticated } from '../config/webAuth.js';


const router = express.Router();

// submit order api
router.post('/submit-order', submitOrder);

// rendering the check-return page in dashboard 
router.get('/check-return', checkAuthenticated, (req, res) => {
    res.render('dashboard/return')
})

// updating the order 
router.put('/update-order', updateOrder)

// getting the orders in the table api
router.get('/orders', checkAuthenticated, async (req, res) => {
    try {
        const { orders, information } = await getOrders();
        res.render('dashboard/orders', { orders, information });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Server error");
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

// for checking the returned orders
router.post('/checkreturned-order', checkAuthenticated, checkReturnedOrder)



export default router;
