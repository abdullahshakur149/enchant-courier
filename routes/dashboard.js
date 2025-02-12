import express from 'express';
const router = express.Router();
import { checkAuthenticated } from '../config/webAuth.js';
import { getMonthlyOrderStats } from "../controllers/orders/order.controller.js";

// Authentication middleware
router.use(checkAuthenticated);

router.get('/', async (req, res) => {
    try {
        // stats for code
        const stats = await getMonthlyOrderStats();
        // console.log("Order Stats:", stats);

        res.render('dashboard/dashboard', { user: req.user, stats });
    } catch (err) {
        console.error("Error in dashboard route:", err);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
