import mongoose from 'mongoose';

// Order Schema
const orderSchema = new mongoose.Schema({
    trackingNumber: { type: String, required: true, unique: true },
    flyerId: { type: String, required: true, unique: true },
    courierType: { type: String, required: true },
    status: {
        type: String,
        enum: ['dispatched', 'return_recieved', 'payment_recieved'],
        default: 'dispatched'
    }
}, { timestamps: true });

const completedOrdersSchema = new mongoose.Schema({
    trackingNumber: { type: String, required: true, unique: true },
    flyerId: { type: String, required: true, unique: true },
    status: {
        type: String,
    }
}, { timestamps: true });

const returnedOrdersSchema = new mongoose.Schema({
    trackingNumber: { type: String, required: true, unique: true },
    flyerId: { type: String, required: true, unique: true },
    status: {
        type: String,
    }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
const CompletedOrder = mongoose.model('CompletedOrder', completedOrdersSchema);
const ReturnedOrder = mongoose.model('ReturnedOrder', returnedOrdersSchema);

export { Order, CompletedOrder, ReturnedOrder }; 
