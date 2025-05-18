import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['create', 'update', 'delete', 'status_change', 'remark_add']
    },
    entity: {
        type: String,
        required: true,
        enum: ['order', 'user', 'system']
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    details: {
        type: Object,
        default: {}
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Log = mongoose.model('Log', logSchema);

export { Log }; 