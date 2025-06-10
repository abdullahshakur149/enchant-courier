import express from 'express';
import passport from 'passport';
import { checkNotAuthenticated } from '../config/webAuth.js';

const router = express.Router();

router.get('/', checkNotAuthenticated, (req, res) => {
    console.log('Auth page accessed:', {
        session: req.session,
        user: req.user,
        isAuthenticated: req.isAuthenticated()
    });

    res.render('auth/login', {
        error: req.flash("error")[0],
        page: 'auth'
    });
});

router.post('/', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Authentication error:', err);
            return res.status(500).json({ success: false, message: 'An error occurred during authentication' });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: info.message || 'Invalid username or password' });
        }

        req.logIn(user, (err) => {
            if (err) {
                console.error('Login error:', err);
                return res.status(500).json({ success: false, message: 'An error occurred during login' });
            }

            // Save session explicitly
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ success: false, message: 'Error saving session' });
                }

                console.log('Login successful:', {
                    sessionID: req.sessionID,
                    user: user,
                    isAuthenticated: req.isAuthenticated()
                });

                return res.json({
                    success: true,
                    redirectUrl: '/dashboard',
                    user: {
                        id: user._id,
                        username: user.username,
                        role: user.role
                    }
                });
            });
        });
    })(req, res, next);
});

router.post('/logout', (req, res, next) => {
    console.log('Logout requested:', {
        sessionID: req.sessionID,
        user: req.user
    });

    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy((err) => {
            if (err) return next(err);
            res.clearCookie('sessionId');
            res.redirect('/auth');
        });
    });
});

export default router;
