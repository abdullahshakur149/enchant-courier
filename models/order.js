import mongoose from 'mongoose';

// Order Schema
const orderSchema = new mongoose.Schema({
    trackingNumber: { type: String, required: true, unique: true },
    flyerId: { type: String, required: true, unique: true },
    courierType: { type: String, required: true },
    status: {
        type: String,
        default: 'Pending'
    },
    invoicePayment: {
        type: Number,
        default: 0
    },
    last_tracking_update: {
        type: Date,
        default: Date.now
    },
    isDelivered: {
        type: Boolean,
        default: false
    },
    isReturned: {
        type: Boolean,
        default: false
    },
    delivered_at: {
        type: Date,
        default: null
    },
    returned_at: {
        type: Date,
        default: null
    },
    rawJson: {
        type: Object,
        default: {}
    },
    productInfo: {
        OrderNumber: String,
        date: String,
        CustomerName: { type: String, },
        Address: { type: String, },
        OrderDetails: {
            ProductName: String,
            Quantity: String
        }
    }
}, { timestamps: true });

const returnedOrderSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true
    },
    verified: { type: Boolean, default: false },
    verification_date: { type: Date, default: null }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
const ReturnedOrder = mongoose.model('ReturnedOrder', returnedOrderSchema);

export { Order, ReturnedOrder };
