import express from 'express';
import colors from 'colors';
import connectDB from './utils/database/db.js';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import flash from 'express-flash';
import initializePassport from './config/passportConfig.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import expressLayouts from 'express-ejs-layouts';
import bodyParser from 'body-parser';
import courierRoutes from './routes/courier.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import dashboardRoutes from './routes/dashboard.js';
import apiOrdersRoutes from './routes/api/orders.js';
import apiEmployeeRoutes from './routes/api/employee-management.js';
import apiLogsRoutes from './routes/api/logs.js';
import logsRoutes from './routes/logs.js';
import notificationRoutes from './routes/notifications.js';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Initialize DB Connection
connectDB();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({
    server,
    // Add secure WebSocket configuration
    perMessageDeflate: false,
    clientTracking: true
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(join(__dirname, 'public')));
app.use('/css', express.static(join(__dirname, 'public/css')));
app.use('/js', express.static(join(__dirname, 'public/js')));
app.use('/images', express.static(join(__dirname, 'public/images')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Session configuration
const sessionConfig = {
    secret: process.env.SECRET_KEY || 'your-secret-key',
    saveUninitialized: false,
    resave: false,
    cookie: {
        maxAge: 4 * 24 * 60 * 60 * 1000, // 4 days
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
    },
    name: 'sessionId'
};

// Use MongoDB store in production, memory store in development
if (process.env.NODE_ENV === 'production') {
    sessionConfig.store = MongoStore.create({
        mongoUrl: process.env.MONGO_URL,
        ttl: 4 * 24 * 60 * 60,
        autoRemove: 'native',
        touchAfter: 24 * 3600,
        crypto: {
            secret: process.env.SESSION_SECRET || 'your-session-secret'
        }
    });
}

app.use(session(sessionConfig));

// Add trust proxy for secure cookies
app.set('trust proxy', 1);

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Initialize Passport configuration
initializePassport(passport);

// Flash messages
app.use(flash());

// Global variables middleware
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

// Routes
app.get('/', (req, res) => {
    res.render('home/index', {
        title: 'Home',
        user: req.user || null
    });
});

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/courier', courierRoutes);
app.use('/logs', logsRoutes);
app.use('/api/logs', apiLogsRoutes);
app.use('/', notificationRoutes);
app.use('/api/orders', apiOrdersRoutes);
app.use('/api', apiEmployeeRoutes);
app.post("/webhooks/fulfillment", express.json(), (req, res) => {
    const data = req.body;
    console.log("📦 Fulfillment Received:", data);
    res.sendStatus(200);
});

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

// Function to broadcast notifications to all connected clients
export function broadcastNotification(notification) {
    console.log('Broadcasting notification:', notification);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify({
                    type: 'notification',
                    title: notification.title,
                    message: notification.message
                }));
                console.log('Notification sent successfully');
            } catch (error) {
                console.error('Error sending notification:', error);
            }
        }
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', err);
    res.status(500).render('error', {
        title: 'Error',
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 Not Found',
        message: 'The page you are looking for does not exist.',
        error: {}
    });
});

// Export the Express app for Vercel
export default app;

// Only start the server if we're not in a serverless environment
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`.yellow.bold);
    });
}

// fixed
// some changes