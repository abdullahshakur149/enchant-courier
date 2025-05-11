import { Order } from '../../models/order.js';
import axios from 'axios';
import dayjs from 'dayjs'; // Import dayjs for date manipulation
import utc from 'dayjs/plugin/utc.js'; // Import the UTC plugin
import timezone from 'dayjs/plugin/timezone.js'; // Import the timezone plugin

// Extend dayjs with UTC and timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export const updateOrderStatuses = async (req, res) => {
    try {
        console.log('Cronjob triggered at 3:00 AM');

        const orders = await Order.find({}, "trackingNumber courierType flyerId");

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
                    // console.log('PostEx Date', data.transactionDate);

                    // Normalize PostEx date (YYYY-MM-DD) to ISO 8601 UTC format
                    const normalizedPostExDate = dayjs(data.transactionDate).startOf('day').utc().toDate();

                    const updateFields = {
                        customer_name: data.customerName || order.customer_name,
                        address: data.deliveryAddress || order.address,
                        status: status || order.status,
                        invoicePayment: data.invoicePayment || order.invoicePayment,
                        last_tracking_update: timestamp,
                        rawJson: data,
                        productInfo: {
                            OrderNumber: data.orderRefNumber || "Not Available",
                            date: data.transactionDate || "Not Available",
                            CustomerName: data.customerName || order.productInfo?.CustomerName || "Not Available",
                            Address: data.deliveryAddress || order.productInfo?.Address || "Not Available",
                            OrderDetails: {
                                ProductName: data.orderDetail || "Not Available",
                                Quantity: data.items?.toString() || "Not Available",
                            },
                        },
                    };

                    if (status?.includes('Delivered')) {
                        updateFields.delivered_at = normalizedPostExDate.toISOString();
                        updateFields.isDelivered = true;
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
                    const date = latest?.Date;
                    // console.log('Daewoo Date', date);

                    // Normalize Daewoo date (MM/DD/YYYY HH:mm:ss A) to ISO 8601 UTC format
                    const normalizedDaewooDate = dayjs(date, "MM/DD/YYYY hh:mm:ss A").utc().toDate();

                    const updateFields = {
                        status: status || order.status,
                        latest_courier_status: latest?.Status_Reason || order.latest_courier_status,
                        last_tracking_update: timestamp,
                        rawJson: latest,
                        productInfo: {
                            OrderNumber: order.trackingNumber,
                            date: date || "Not Available",
                            CustomerName: order.productInfo?.CustomerName || "Not Available",
                            Address: order.productInfo?.Address || "Not Available",
                            OrderDetails: {
                                ProductName: "Not Available",
                                Quantity: "Not Available"
                            }
                        }
                    };

                    if (status?.includes("DELIVERED") || status?.includes("OK - DELIVERED - DELIVERED")) {
                        updateFields.delivered_at = normalizedDaewooDate.toISOString(); // Use normalized date
                        updateFields.isDelivered = true;
                    }

                    await Order.findByIdAndUpdate(order._id, updateFields);

                } catch (error) {
                    console.error(`Error processing Daewoo order ${order._id}:`, error);
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
                    const product = details.order_information?.items?.[0] || {};
                    const status = latest?.status;
                    const timestamp = latest?.timestamp ? new Date(latest.timestamp * 1000) : new Date();
                    // console.log('Trax Date', timestamp);

                    const updateFields = {
                        customer_name: details.consignee?.name || order.customer_name,
                        address: details.consignee?.address || order.address,
                        status: status || order.status,
                        latest_courier_status: status || order.latest_courier_status,
                        last_tracking_update: timestamp,
                        invoicePayment: details.order_information?.amount || order.invoicePayment,
                        rawJson: data,
                        productInfo: {
                            OrderNumber: details.order_id || order.trackingNumber,
                            date: details.order_date || "Not Available",
                            CustomerName: details.consignee?.name || order.productInfo?.CustomerName || "Not Available",
                            Address: details.consignee?.address || order.productInfo?.Address || "Not Available",
                            OrderDetails: {
                                ProductName: product.description || "Not Available",
                                Quantity: product.quantity?.toString() || "Not Available"
                            }
                        }
                    };

                    if (status?.includes("Shipment - Delivered")) {
                        updateFields.delivered_at = timestamp.toISOString(); // Use normalized date
                        updateFields.isDelivered = true;
                    }

                    await Order.findByIdAndUpdate(order._id, updateFields);

                } catch (error) {
                    console.error(`Error processing Trax order ${order._id}:`, error.message);
                }
            }));
        }

        res.json({
            success: true,
            message: "Order statuses updated successfully",
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update order statuses",
            error: error.message
        });
    }
};
