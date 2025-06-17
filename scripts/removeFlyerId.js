import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function removeFlyerId() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB');

        // Get the orders collection
        const ordersCollection = mongoose.connection.db.collection('orders');

        // Remove flyerId field from all documents
        const result = await ordersCollection.updateMany(
            {}, // match all documents
            { $unset: { flyerId: "" } } // remove flyerId field
        );

        console.log(`Modified ${result.modifiedCount} documents`);
        console.log('Successfully removed flyerId field from all orders');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

// Run the script
removeFlyerId(); 