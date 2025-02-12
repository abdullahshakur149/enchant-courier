import express from 'express';
import passport from 'passport';
import { checkNotAuthenticated } from '../config/webAuth.js';

const router = express.Router();

router.get('/', checkNotAuthenticated, (req, res) => {
    res.render('admin/login', { error: req.flash("error")[0] });
});

router.post('/', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}));

router.delete('/', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.json({ success: true, redirectUrl: '/login' });
    });
});


export default router;
