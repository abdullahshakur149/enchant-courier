export const checkAuthenticated = (req, res, next) => {
    console.log('Checking authentication status:', {
        user: req.user,
        session: req.session,
        cookies: req.cookies
    });

    // Simple check for user existence
    if (req.user) {
        return next();
    }

    // If not authenticated, send a JSON response instead of redirecting
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
            authenticated: false,
            message: 'Not authenticated'
        });
    }

    res.redirect('/auth');
};

export const checkNotAuthenticated = (req, res, next) => {
    console.log('Checking not authenticated status:', {
        user: req.user,
        session: req.session,
        cookies: req.cookies
    });

    // Simple check for user existence
    if (req.user) {
        return res.redirect('/dashboard');
    }
    next();
};

export const checkAdmin = (req, res, next) => {
    console.log('Checking admin status:', {
        user: req.user,
        role: req.user?.role
    });

    // Simple check for user existence
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    next();
};
