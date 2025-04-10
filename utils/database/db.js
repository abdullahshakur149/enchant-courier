import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const connectDB = async () => {
    try {
        const con = await mongoose.connect(MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB connected: ${con.connection.host}`);
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

export default connectDB;
