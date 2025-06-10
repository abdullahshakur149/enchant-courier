export const checkAuthenticated = (req, res, next) => {
    console.log('Checking authentication status:', {
        isAuthenticated: req.isAuthenticated(),
        session: req.session,
        user: req.user,
        cookies: req.cookies
    });

    if (req.isAuthenticated()) {
        return next();
    }

    // If not authenticated, send a JSON response instead of redirecting
    if (req.xhr || req.headers.accept.includes('application/json')) {
        return res.status(401).json({
            authenticated: false,
            message: 'Not authenticated'
        });
    }

    res.redirect('/auth');
};

export const checkNotAuthenticated = (req, res, next) => {
    console.log('Checking not authenticated status:', {
        isAuthenticated: req.isAuthenticated(),
        session: req.session,
        user: req.user,
        cookies: req.cookies
    });

    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    next();
};

export const checkAdmin = (req, res, next) => {
    console.log('Checking admin status:', {
        isAuthenticated: req.isAuthenticated(),
        user: req.user,
        role: req.user?.role
    });

    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    next();
};
