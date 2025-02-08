import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    trackingNumber: { type: String, required: true, unique: true },
    flyerId: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ['dispatched', 'received'],
        default: 'dispatched'
    }
});

// Create model from schema
const Order = mongoose.model('Order', orderSchema);

// Export model
export default Order;
