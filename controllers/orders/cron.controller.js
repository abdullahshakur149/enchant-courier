import { Order } from '../../models/order.js';
import { Notification } from '../../models/notification.js';
import axios from 'axios';
import dayjs from 'dayjs'; // Import dayjs for date manipulation
import utc from 'dayjs/plugin/utc.js'; // Import the UTC plugin
import timezone from 'dayjs/plugin/timezone.js'; // Import the timezone plugin
import twilio from 'twilio';
import User from '../../models/user.js';



// Extend dayjs with UTC and timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);



export const updateOrderStatuses = async (req, res) => {
    try {
        console.log('Cronjob triggered for status updates');

        const deliveredAtTimestamp = new Date();

        const orders = await Order.find({
            isDelivered: { $ne: true },
            isReturned: { $ne: true }
        }, "trackingNumber courierType flyerId isDelivered isReturned status");

        // ===================== PostEx =====================
        const postexOrders = orders.filter(order => order.courierType.toLowerCase() === "postex");

        if (postexOrders.length > 0) {
            const postexTrackingNumbers = postexOrders.map(order => order.trackingNumber);

            try {
                const postexApiUrl = process.env.POSTEXAPI_URL;
                const postexResponse = await axios.get(postexApiUrl, {
                    headers: {
                        "token": process.env.POSTEXMERCHANT_KEY,
                        "Content-Type": "application/json"
                    },
                    params: { TrackingNumbers: postexTrackingNumbers },
                    paramsSerializer: { indexes: null }
                });

                await Promise.all(postexResponse.data.dist.map(async (item) => {
                    const order = postexOrders.find(o => o.trackingNumber === item.trackingNumber);
                    const data = item.trackingResponse || {};
                    const status = data.transactionStatus;
                    const timestamp = new Date();

                    const updateFields = {
                        status: status || order.status,
                        last_tracking_update: timestamp
                    };

                    if (status?.includes('Delivered')) {
                        updateFields.delivered_at = deliveredAtTimestamp.toISOString();
                        updateFields.isDelivered = true;

                        await Notification.create({
                            type: 'order_delivered',
                            title: 'Order Delivered',
                            message: `Order #${order.trackingNumber} has been delivered`,
                        });
                    }

                    await Order.findByIdAndUpdate(order._id, updateFields);
                }));

            } catch (error) {
                console.error("Error updating PostEx orders:", error);
            }
        }

        // ===================== Daewoo =====================
        const daewooOrders = orders.filter(order => order.courierType.toLowerCase() === "daewoo");

        if (daewooOrders.length > 0) {
            await Promise.all(daewooOrders.map(async (order) => {
                try {
                    const daewooBaseUrl = process.env.DAEWOOAPI_URL;
                    const daewooResponse = await axios.get(`${daewooBaseUrl}${order.trackingNumber}`);
                    const trackingResult = daewooResponse.data?.Result || {};
                    const trackingDetails = trackingResult.TrackingDetails || [];
                    const latest = trackingDetails.at(-1);

                    const status = latest?.Status;
                    const timestamp = new Date();

                    const updateFields = {
                        status: status || order.status,
                        last_tracking_update: timestamp
                    };

                    if (status?.includes("DELIVERED") || status?.includes("OK - DELIVERED - DELIVERED")) {
                        updateFields.delivered_at = deliveredAtTimestamp.toISOString();
                        updateFields.isDelivered = true;

                        await Notification.create({
                            type: 'order_delivered',
                            title: 'Order Delivered',
                            message: `Order #${order.trackingNumber} has been delivered`,
                        });
                    }

                    await Order.findByIdAndUpdate(order._id, updateFields);

                } catch (error) {
                    console.error(`Error processing Daewoo order ${order._id}:`, error.message);
                }
            }));
        }

        // ===================== Trax =====================
        const traxOrders = orders.filter(order => order.courierType.toLowerCase() === "trax");

        if (traxOrders.length > 0) {
            await Promise.all(traxOrders.map(async (order) => {
                try {
                    const traxBaseUrl = process.env.TRAXAPI_URL;
                    const traxResponse = await axios.get(traxBaseUrl, {
                        headers: {
                            Authorization: process.env.TRAXMERCHANT_KEY,
                        },
                        params: {
                            tracking_number: order.trackingNumber,
                            type: 0
                        }
                    });

                    const data = traxResponse.data;
                    const details = data.details || {};
                    const trackingHistory = details.tracking_history || [];
                    const latest = trackingHistory[0];
                    const status = latest?.status;
                    const timestamp = latest?.timestamp ? new Date(latest.timestamp * 1000) : new Date();

                    const updateFields = {
                        status: status || order.status,
                        last_tracking_update: timestamp
                    };

                    if (status?.includes('Delivered')) {
                        updateFields.delivered_at = deliveredAtTimestamp.toISOString();
                        updateFields.isDelivered = true;

                        await Notification.create({
                            type: 'order_delivered',
                            title: 'Order Delivered',
                            message: `Order #${order.trackingNumber} has been delivered`,
                        });
                    }

                    await Order.findByIdAndUpdate(order._id, updateFields);

                } catch (error) {
                    console.error(`Error processing Trax order ${order._id}:`, error.message);
                }
            }));
        }

        res.status(200).json({ success: true, message: 'Order statuses updated successfully' });
    } catch (error) {
        console.error('Error in updateOrderStatuses:', error);
        res.status(500).json({ success: false, message: 'Error updating order statuses', error: error.message });
    }
};
