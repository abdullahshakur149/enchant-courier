import express from 'express';
import { submitOrder, getOrders } from "../controllers/orders/order.controller.js";
import { checkAuthenticated } from '../config/webAuth.js';


const router = express.Router();

router.post('/submit-order', submitOrder);

router.get('/orders', checkAuthenticated, getOrders, (req, res, next) => {
    res.render('dashboard/orders')
})

export default router;
