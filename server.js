import express from 'express';
import colors from 'colors';
import connectDB from './utils/database/db.js';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import flash from 'express-flash';
import initializePassport from './config/passportConfig.js';
dotenv.config();


// Initialize DB Connection
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
    secret: process.env.SECRET_KEY,
    saveUninitialized: false,
    resave: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URL,
        ttl: 24 * 60 * 60,
        autoRemove: 'native'
    }),
    cookie: {
        secure: false,
        httpOnly: true
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Initialize Passport
initializePassport(passport);

// Routes
import indexRoute from './routes/index.js';
import orderRouter from './routes/order.js';
import loginRoute from './routes/login.js';
import dashboardRoute from './routes/dashboard.js'

app.use('/', indexRoute);
app.use('/return-order', indexRoute);
app.use('/order', orderRouter);
app.use('/login', loginRoute);
app.use('/logout', loginRoute);
app.use('/dashboard', dashboardRoute)
app.use('/', orderRouter)
// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Your Server is listening on PORT ${PORT}`.bold.red);
    console.log('Server url:', `http://localhost:${PORT}`.green);
});
