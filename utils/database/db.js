import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

// Remove deprecated options
const connectDB = async () => {
    try {
        const con = await mongoose.connect(MONGO_URL);
        console.log(`MongoDB connected: ${con.connection.host}`);

        // List all indexes first
        try {
            const indexes = await mongoose.connection.db.collection('orders').indexes();
            console.log('Current indexes:', indexes);

            // Drop all indexes except _id
            for (const index of indexes) {
                if (index.name !== '_id_') {
                    try {
                        await mongoose.connection.db.collection('orders').dropIndex(index.name);
                        console.log(`Successfully dropped index: ${index.name}`);
                    } catch (err) {
                        if (err.code === 26) { // IndexNotFound error
                            console.log(`Index ${index.name} does not exist, no need to drop`);
                        } else {
                            console.error(`Error dropping index ${index.name}:`, err);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error managing indexes:', err);
        }

        // Handle connection events
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

        return con;
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

export default connectDB;
