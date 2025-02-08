import express from 'express';
import { submitOrder } from "../controllers/orders/order.controller.js";

const router = express.Router();

router.post('/submit-order', submitOrder);

export default router;
