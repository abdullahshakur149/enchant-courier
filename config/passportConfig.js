import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/user.js';

function initialize(passport) {
    passport.use(new LocalStrategy(User.authenticate()));

    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
}

export default initialize;
