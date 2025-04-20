import mongoose from 'mongoose';
import { Order } from '../models/order.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanOrders() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Remove all fields except trackingNumber, flyerId, and courierType
        const result = await Order.updateMany(
            {}, // Match all documents
            {
                $unset: {
                    customer_name: "",
                    address: "",
                    isDelivered: "",
                    isReturned: "",
                    delivered_at: "",
                    returned_at: "",
                    last_tracking_update: "",
                    latest_courier_status: "",
                    invoicePayment: "",
                    productInfo: "",
                    rawJson: "",
                    status_record: "",
                    status: "",
                    __v: ""
                }
            }
        );

        console.log(`Updated ${result.modifiedCount} documents`);
        console.log('Cleaning completed successfully');

    } catch (error) {
        console.error('Error cleaning orders:', error);
    } finally {
        // Close the MongoDB connection
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the cleaning function
cleanOrders(); 