import { Order } from '../../models/order.js';
import { formatDate } from '../../utils/helpers.js';
import axios from 'axios';

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

                    // Get the current order with status_record
                    const currentOrder = await Order.findById(order._id);
                    const statusRecord = `${timestamp.toISOString()} - ${status || 'No Status'}`;
                    
                    // Only push if the status doesn't already exist
                    const updateFields = {
                        customer_name: data.customerName || order.customer_name,
                        address: data.deliveryAddress || order.address,
                        latest_courier_status: status || order.latest_courier_status,
                        invoicePayment: data.invoicePayment || order.invoicePayment,
                        last_tracking_update: timestamp,
                        rawJson: data,
                        ...(currentOrder.status_record.includes(statusRecord) ? {} : { $push: { status_record: statusRecord } }),
                        productInfo: {
                            OrderNumber: data.orderRefNumber || "Not Available",
                            date: formatDate(data.transactionDate) || "Not Available",
                            CustomerName: data.customerName || "Not Available",
                            Address: data.deliveryAddress || "Not Available",
                            OrderDetails: {
                                ProductName: data.orderDetail || "Not Available",
                                Quantity: data.items?.toString() || "Not Available",
                            },
                        },
                    };


                    if (status?.includes('Delivered')) {
                        updateFields.delivered_at = timestamp.toISOString();
                        updateFields.isDelivered = true;
                    }

                    if (status?.includes("RETURNED") || status?.includes("returned")) {
                        updateFields.returned_at = timestamp.toISOString();
                        updateFields.isReturned = true;
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

                    // Get the current order with status_record
                    const currentOrder = await Order.findById(order._id);
                    const statusRecord = `${timestamp.toISOString()} - ${status || 'No Status'}`;

                    const updateFields = {
                        status: status || order.status,
                        latest_courier_status: latest?.Status_Reason || order.latest_courier_status,
                        last_tracking_update: timestamp,
                        rawJson: latest,
                        ...(currentOrder.status_record.includes(statusRecord) ? {} : { $push: { status_record: statusRecord } }),
                        productInfo: {
                            OrderNumber: order.trackingNumber,
                            date: date || "Not Available",
                            CustomerName: order.customer_name || "Not Available",
                            Address: order.address || "Not Available",
                            OrderDetails: {
                                ProductName: "Not Available",
                                Quantity: "Not Available"
                            }
                        }
                    };

                    if (status?.includes("DELIVERED") || status?.includes("OK - DELIVERED")) {
                        updateFields.delivered_at = date;
                        updateFields.isDelivered = true;
                    }

                    if (status?.includes("Return to Shipper")) {
                        updateFields.returned_at = date;
                        updateFields.isReturned = true;
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

                    // Get the current order with status_record
                    const currentOrder = await Order.findById(order._id);
                    const statusRecord = `${timestamp.toISOString()} - ${status || 'No Status'}`;

                    const updateFields = {
                        customer_name: details.consignee?.name || order.customer_name,
                        address: details.consignee?.address || order.address,
                        status: status || order.status,
                        latest_courier_status: status || order.latest_courier_status,
                        last_tracking_update: timestamp,
                        invoicePayment: details.order_information?.amount || order.invoicePayment,
                        rawJson: data,
                        ...(currentOrder.status_record.includes(statusRecord) ? {} : { $push: { status_record: statusRecord } }),
                        productInfo: {
                            OrderNumber: details.order_id || order.trackingNumber,
                            date: details.order_date || "Not Available",
                            CustomerName: details.consignee?.name || "Not Available",
                            Address: details.consignee?.address || "Not Available",
                            OrderDetails: {
                                ProductName: product.description || "Not Available",
                                Quantity: product.quantity?.toString() || "Not Available"
                            }
                        }
                    };

                    if (status?.includes("Shipment - Delivered")) {
                        updateFields.delivered_at = timestamp.toISOString();
                        updateFields.isDelivered = true;
                    }

                    if (status?.includes("Return - Confirm") || status?.includes("Return - Delivered to Shipper")) {
                        updateFields.returned_at = timestamp.toISOString();
                        updateFields.isReturned = true;
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
