import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function dropFlyerIdIndex() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB');

        // Get the orders collection
        const ordersCollection = mongoose.connection.db.collection('orders');

        // Drop the flyerId index
        await ordersCollection.dropIndex('flyerId_1');
        console.log('Successfully dropped flyerId index');

        // Verify the index is gone
        const indexes = await ordersCollection.indexes();
        console.log('Current indexes:', indexes);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

// Run the script
dropFlyerIdIndex(); 