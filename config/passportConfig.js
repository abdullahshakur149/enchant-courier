import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/user.js';

function initialize(passport) {
    passport.use(new LocalStrategy({
        usernameField: 'username',  // Using 'username' as the field for the login
        passwordField: 'password',  // Using 'password' as the password field
    }, async (username, password, done) => {
        console.log('Attempting to authenticate user:', username);
        console.log('Received password:', password);

        try {
            // Look for the user by username (not email)
            const user = await User.findOne({ username });
            console.log('User found:', user);

            if (!user) {
                console.log('No user found with that username');
                return done(null, false, { message: 'No user found with that username' });
            }

            // Use passport-local-mongoose's authenticate method to validate the password
            user.authenticate(password, (err, authenticatedUser) => {
                if (err || !authenticatedUser) {
                    console.log('Incorrect password');
                    return done(null, false, { message: 'Incorrect password' });
                }

                console.log('User authenticated successfully');
                return done(null, authenticatedUser);
            });

        } catch (err) {
            console.log('Error during authentication:', err);
            return done(err);
        }
    }));

    // Serialize and deserialize user from the session
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
}

export default initialize;
