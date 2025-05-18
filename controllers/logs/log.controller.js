import { getLogs } from '../../utils/logger.js';

export const viewLogs = async (req, res) => {
    try {
        const {
            action,
            entity,
            entityId,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = req.query;

        const result = await getLogs({
            action,
            entity,
            entityId,
            startDate,
            endDate,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json(result);
    } catch (error) {
        console.error('Error in viewLogs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching logs'
        });
    }
}; 