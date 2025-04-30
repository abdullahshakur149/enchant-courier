import express from 'express';
import { checkAuthenticated } from '../config/webAuth.js';

const router = express.Router();

// Guide page route
router.get('/guide', checkAuthenticated, (req, res) => {
    res.render('guide', { 
        user: req.user,
        title: 'Developer Guide',
        path: '/admin/guide'
    });
});

export default router; 