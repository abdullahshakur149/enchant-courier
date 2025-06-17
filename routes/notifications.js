import express from 'express';
import { Notification } from '../models/notification.js';
import { isAuthenticated } from '../middleware/auth.js';
import { Order } from '../models/order.js';
import { broadcastNotification } from '../server.js';

const router = express.Router();

// Get all notifications for the current user (API endpoint)
router.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalNotifications = await Notification.countDocuments({ user: req.user._id });

        // Get additional order information for each notification
        const notificationsWithDetails = await Promise.all(notifications.map(async (notification) => {
            const notificationObj = notification.toObject();

            // If notification has an orderId and is not a deletion notification, fetch additional order details
            if (notification.orderId && notification.type !== 'order_deleted') {
                const order = await Order.findById(notification.orderId);
                if (order) {
                    notificationObj.courierType = order.courierType;
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
            unreadCount,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalNotifications / limit),
                totalNotifications,
                limit
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// Create a new notification
router.post('/api/notifications', isAuthenticated, async (req, res) => {
    try {
        const notification = await Notification.create({
            ...req.body,
            user: req.user._id
        });

        // Broadcast the notification to all connected clients
        broadcastNotification(notification);

        res.status(201).json(notification);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ message: 'Error creating notification' });
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