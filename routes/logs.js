import express from 'express';
import { isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get logs page (admin only)
router.get('/', isAdmin, (req, res) => {
    res.render('logs/index', {
        title: 'System Logs',
        user: req.user
    });
});

export default router; 