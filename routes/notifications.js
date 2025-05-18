import express from 'express';
import { Notification } from '../models/notification.js';
import { isAuthenticated } from '../middleware/auth.js';
import { Order } from '../models/order.js';

const router = express.Router();

// Get all notifications for the current user (API endpoint)
router.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10);

        // Get additional order information for each notification
        const notificationsWithDetails = await Promise.all(notifications.map(async (notification) => {
            const notificationObj = notification.toObject();
            
            // If notification has an orderId and is not a deletion notification, fetch additional order details
            if (notification.orderId && notification.type !== 'order_deleted') {
                const order = await Order.findById(notification.orderId);
                if (order) {
                    notificationObj.courierType = order.courierType;
                    notificationObj.flyerId = order.flyerId;
                    notificationObj.trackingNumber = order.trackingNumber;
                }
            }
            
            return notificationObj;
        }));

        const unreadCount = await Notification.countDocuments({
            user: req.user._id,
            isRead: false
        });

        res.json({
            notifications: notificationsWithDetails,
            unreadCount
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// Mark a notification as read (API endpoint)
router.post('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error marking notification as read' });
    }
});

// Mark all notifications as read (API endpoint)
router.post('/api/notifications/read-all', isAuthenticated, async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user._id, isRead: false },
            { isRead: true }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Error marking all notifications as read' });
    }
});

// Get notifications page
router.get('/notifications', isAuthenticated, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 });

        // Get additional order information for each notification
        const notificationsWithDetails = await Promise.all(notifications.map(async (notification) => {
            const notificationObj = notification.toObject();
            
            // If notification has an orderId and is not a deletion notification, fetch additional order details
            if (notification.orderId && notification.type !== 'order_deleted') {
                const order = await Order.findById(notification.orderId);
                if (order) {
                    notificationObj.courierType = order.courierType;
                    notificationObj.flyerId = order.flyerId;
                    notificationObj.trackingNumber = order.trackingNumber;
                }
            }
            
            return notificationObj;
        }));

        res.render('notifications', {
            title: 'Notifications',
            user: req.user,
            notifications: notificationsWithDetails,
            path: '/notifications',
            layout: 'layouts/dashboard'
        });
    } catch (error) {
        console.error('Error fetching notifications page:', error);
        res.status(500).json({ message: 'Error fetching notifications page' });
    }
});

export default router; 