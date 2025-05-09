export const checkAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth');
};

export const checkNotAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    next();
};

export const checkAdmin = (req, res, next) => {
    // Check if the user is authenticated
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if the authenticated user has an admin role
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    // If the user is an admin, proceed to the next middleware
    next();
};
