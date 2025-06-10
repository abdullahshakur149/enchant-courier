import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/user.js';

function initialize(passport) {
    // Serialize user for the session
    passport.serializeUser((user, done) => {
        console.log('Serializing user:', user._id);
        done(null, user._id);
    });

    // Deserialize user from the session
    passport.deserializeUser(async (id, done) => {
        try {
            console.log('Deserializing user:', id);
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            console.error('Error deserializing user:', err);
            done(err);
        }
    });

    passport.use(new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password',
    }, async (username, password, done) => {
        console.log('Attempting to authenticate user:', username);

        try {
            const user = await User.findOne({ username });
            console.log('User found:', user ? 'Yes' : 'No');

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
}

export default initialize;
