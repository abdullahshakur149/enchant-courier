import express from 'express';
import { submitOrder } from '../controllers/orders/order.controller.js';

const router = express.Router();

// Home page route
router.get('/', (req, res) => {
    res.render('home/index', { 
        user: req.user,
        title: 'Enchant Courier - Home'
    });
});

// Form page route
router.get('/form', (req, res) => {
    const courierType = req.query.type;
    if (!courierType || !['Trax', 'Daewoo', 'PostEx'].includes(courierType)) {
        req.flash('error', 'Invalid courier type selected');
        return res.redirect('/');
    }
    res.render('courier/form', { 
        courierType,
        user: req.user,
        title: `Submit Tracking - ${courierType}`
    });
});

// Form submission route
router.post('/submit-order', submitOrder);

// Support page route
router.get('/support', (req, res) => {
    res.render('support', { 
        user: req.user,
        title: 'Support',
        path: '/support'
    });
});

export default router; 