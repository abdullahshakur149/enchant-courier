import express from 'express'
const router = express.Router();
import { checkAuthenticated } from '../config/webAuth.js';

// Authentication
router.use(checkAuthenticated);


router.get('/', async (req, res, next) => {
    try {
        res.render('dashboard/dashboard');
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

export default router;



