import express from 'express'
const router = express.Router();
import { checkAuthenticated } from '../config/webAuth.js';

// Authentication
router.use(checkAuthenticated);


router.get('/', async (req, res, next) => {
    // console.log("Logged-in User:", req.user); 
    try {
        res.render('dashboard/dashboard', { user: req.user });
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

export default router;



