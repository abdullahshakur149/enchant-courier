import express from 'express';
const router = express.Router();
import { checkAuthenticated } from '../config/webAuth.js';
import { verifyReturnedOrders } from '../controllers/orders/order.controller.js';


router.post('/verify-return', checkAuthenticated, verifyReturnedOrders);


export default router;
