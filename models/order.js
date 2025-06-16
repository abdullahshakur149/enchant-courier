import mongoose from 'mongoose';

// Order Schema
const orderSchema = new mongoose.Schema({
    trackingNumber: {
        type: String,
        required: true,
        // Remove unique constraint since multiple items can share same tracking number
    },
    flyerId: {
        type: String,
        required: false, // Make flyerId optional
        index: false // Remove index
    },
    courierType: { type: String, required: true },
    status: {
        type: String,
        default: 'Pending'
    },
    invoicePayment: {
        type: Number,
        default: 0
    },
    totalPrice: {
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
    remarks: [
        {
            _id: false,
            content: { type: String, default: null },
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: { type: Date, default: Date.now },
        }
    ],
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
            Quantity: String,
            Price: Number,
            TotalPrice: Number
        }
    }
}, { timestamps: true });

// Add compound index for tracking number and product name to ensure uniqueness
orderSchema.index({ trackingNumber: 1, 'productInfo.OrderDetails.ProductName': 1 }, { unique: true });

const returnedOrderSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    verified: { type: Boolean, default: false },
    verification_date: { type: Date, default: null }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
const ReturnedOrder = mongoose.model('ReturnedOrder', returnedOrderSchema);

export { Order, ReturnedOrder };


