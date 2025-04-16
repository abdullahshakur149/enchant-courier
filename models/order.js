import mongoose from 'mongoose';

// Order Schema
const orderSchema = new mongoose.Schema({
    trackingNumber: { type: String, required: true, unique: true },
    flyerId: { type: String, required: true, unique: true },
    courierType: { type: String, required: true },
    customer_name: { type: String, default: null },
    address: { type: String, default: null },
    isDelivered: { type: Boolean, default: false },
    delivered_at: { type: String, default: null },
    returned_at: { type: String, default: null },
    last_tracking_update: { type: Date, default: null },
    latest_courier_status: { type: String, default: null },
    invoicePayment: { type: Number, default: null }
}, { timestamps: true });

const orderUpdatesSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    status_record: [],
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
    last_tracking_update: { type: Date },
    rawJson: {}
}, { timestamps: true });


const Order = mongoose.model('Order', orderSchema);

const OrderUpdate = mongoose.model('OrderUpdate', orderUpdatesSchema);

export { Order, OrderUpdate }; 
