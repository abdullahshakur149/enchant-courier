import mongoose from 'mongoose';

// Order Schema
const orderSchema = new mongoose.Schema({
    trackingNumber: {
        type: String,
        required: true,
        index: true // Simple index for better query performance
    },
    courierType: { type: String, required: true },
    status: {
        type: String,
        default: 'Pending',
        index: true // Index for status queries
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
}, {
    timestamps: true,
    // Add compound index for common queries
    indexes: [
        { trackingNumber: 1, status: 1 }, // For tracking number and status queries
        { createdAt: -1 } // For sorting by creation date
    ]
});

// No additional indexes needed - we're using the index defined in the schema

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


