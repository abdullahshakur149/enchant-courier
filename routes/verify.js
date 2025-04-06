import express from 'express';
const router = express.Router();
import { checkAuthenticated } from '../config/webAuth.js';
import { verifyReturnedOrders, verifyCompletedOrders } from '../controllers/orders/order.controller.js';


router.post('/verify-return', checkAuthenticated, verifyReturnedOrders);

router.post('/verify-complete', checkAuthenticated, verifyCompletedOrders);


export default router;
