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
    },
    updates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderUpdate' }]
}, { timestamps: true });

const orderUpdatesSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    latestStatus: { type: String },
    productInfo: {
        OrderNumber: { type: String },
        date: { type: String },
        CustomerName: { type: String },
        Address: { type: String },
        OrderDetails: {
            ProductName: { type: String },
            Quantity: { type: String },
        },
    },
    rawJson: {}
}, { timestamps: true });

const completedOrdersSchema = new mongoose.Schema({
    trackingNumber: { type: String, required: true },
    flyerId: { type: String, required: true },
    courierType: { type: String, required: true },
    latestStatus: { type: String },
    productInfo: {
        OrderNumber: { type: String },
        date: { type: String },
        CustomerName: { type: String },
        Address: { type: String },
        OrderDetails: {
            ProductName: { type: String },
            Quantity: { type: String },
        },
    }
}, { timestamps: true });

const returnedOrdersSchema = new mongoose.Schema({
    trackingNumber: { type: String, required: true },
    flyerId: { type: String, required: true },
    courierType: { type: String, required: true },
    latestStatus: { type: String },
    productInfo: {
        OrderNumber: { type: String },
        date: { type: String },
        CustomerName: { type: String },
        Address: { type: String },
        OrderDetails: {
            ProductName: { type: String },
            Quantity: { type: String },
        },
    }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
const CompletedOrder = mongoose.model('CompletedOrder', completedOrdersSchema);
const ReturnedOrder = mongoose.model('ReturnedOrder', returnedOrdersSchema);
const OrderUpdate = mongoose.model('OrderUpdate', orderUpdatesSchema);

export { Order, CompletedOrder, ReturnedOrder, OrderUpdate }; 
