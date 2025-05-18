import { Log } from '../models/log.js';

export const createLog = async ({
    action,
    entity,
    entityId,
    details = {},
    performedBy,
    req = null
}) => {
    try {
        const logData = {
            action,
            entity,
            entityId,
            details,
            performedBy,
            timestamp: new Date()
        };

        // Add request information if available
        if (req) {
            // Get the real IP address, handling proxy headers
            const ip = req.headers['x-forwarded-for'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress;
            
            // Convert IPv6 loopback to IPv4 loopback for consistency
            logData.ipAddress = ip === '::1' ? '127.0.0.1' : ip;
            logData.userAgent = req.get('user-agent');
        }

        const log = new Log(logData);
        await log.save();
        return log;
    } catch (error) {
        console.error('Error creating log:', error);
        // Don't throw the error to prevent disrupting the main application flow
    }
};

export const getLogs = async ({
    action,
    entity,
    entityId,
    startDate,
    endDate,
    page = 1,
    limit = 50
}) => {
    try {
        const query = {};
        
        if (action) query.action = action;
        if (entity) query.entity = entity;
        if (entityId) query.entityId = entityId;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;
        
        const [logs, total] = await Promise.all([
            Log.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .populate('performedBy', 'username role'),
            Log.countDocuments(query)
        ]);

        return {
            logs,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalLogs: total,
                limit
            }
        };
    } catch (error) {
        console.error('Error fetching logs:', error);
        throw error;
    }
};

export const logActivity = async (type, description, userId, details = {}) => {
    try {
        const log = new Log({
            type,
            description,
            userId,
            details
        });
        await log.save();
        return log;
    } catch (error) {
        console.error('Error logging activity:', error);
        throw error;
    }
}; 