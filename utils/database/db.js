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

        // // Drop the 'email_1' index from the 'users' collection
        // await mongoose.connection.db.collection('users').dropIndex('email_1');
        // // console.log('Email index dropped successfully!');

        console.log(`MongoDB connected: ${con.connection.host}`);
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

export default connectDB;
