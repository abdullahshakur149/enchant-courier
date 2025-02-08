require('dotenv').config();

const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGO_URL;

const connectDB = async () => {
    try {
        const con = await mongoose.connect(MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // Remove the following options as they are deprecated
            // useFindAndModify: false,
            // useCreateIndex: true
        });
        console.log(`MongoDB connected: ${con.connection.host}`);
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
