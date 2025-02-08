import express from 'express';
import colors from 'colors';
import connectDB from './utils/database/db.js';
import dotenv from 'dotenv';
dotenv.config();

connectDB();

const app = express();

// Middlewares
app.use(express.json()); // Handles JSON requests
app.use(express.urlencoded({ extended: true })); // Handles form data
app.use(express.static('public'));
app.set('view engine', 'ejs');

import indexRoute from './routes/index.js';
import orderRouter from './routes/order.js';
app.use('/', indexRoute);
app.use('/order', orderRouter);

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Your Server is listening on PORT ${PORT}`.bold.red);
    console.log('Server url:', `http://localhost:${PORT}`.green);
});
