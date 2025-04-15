import { Order, OrderUpdate } from '../../models/order.js';
import { formatDate } from '../../utils/helpers.js';
import axios from 'axios';

export const updateOrderStatuses = async (req, res) => {
    try {

        console.log('i have been hit at 3:00 by cronjob')
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

                    const status = data.transactionStatus?.toLowerCase() || '';
                    const timestamp = new Date();

                    const updateFields = {
                        customer_name: data.customerName || order.customer_name,
                        address: data.deliveryAddress || order.address,
                        status: data.transactionStatus || order.status,
                        invoicePayment: data.invoicePayment || order.invoicePayment,
                        last_tracking_update: timestamp,
                    };

                    if (status.includes('delivered')) updateFields.delivered_at = timestamp;
                    if (status.includes('return')) updateFields.returned_at = timestamp;

                    try {
                        await Order.findByIdAndUpdate(order._id, updateFields);
                        const existingUpdate = await OrderUpdate.findOne({ orderId: order._id });

                        if (existingUpdate) {
                            // Check if the status already exists in the status_record
                            const statusExists = existingUpdate.status_record.includes(data.transactionStatus);

                            if (!statusExists) {
                                // Update existing OrderUpdate
                                await OrderUpdate.findByIdAndUpdate(existingUpdate._id, {
                                    $set: { last_tracking_update: timestamp },
                                    $push: { status_record: data.transactionStatus }
                                });
                            }
                        } else {
                            const updateDoc = new OrderUpdate({
                                orderId: order._id,
                                status_record: [data.transactionStatus],
                                productInfo: {
                                    OrderNumber: data.orderRefNumber || "Not Available",
                                    date: formatDate(data.transactionDate) || "Not Available",
                                    CustomerName: data.customerName || "Not Available",
                                    Address: data.deliveryAddress || "Not Available",
                                    OrderDetails: {
                                        ProductName: data.orderDetail || "Not Available",
                                        Quantity: data.items?.toString() || "Not Available",
                                    }
                                },
                                last_tracking_update: timestamp,
                                rawJson: data
                            });

                            await updateDoc.save();
                        }
                    } catch (innerError) {
                        console.error(`Error processing tracking data for order ${order._id}:`, innerError);
                    }
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
                    const latestStatus = trackingDetails.length > 0 ? trackingDetails[trackingDetails.length - 1] : null;

                    const status = latestStatus?.Status?.toLowerCase() || '';
                    const statusReason = latestStatus?.Status_Reason || '';
                    const date = latestStatus?.Date || null;
                    const remarks = latestStatus?.Rem || '';
                    const collectorName = latestStatus?.Collector_Name || '';
                    const collectorContact = latestStatus?.Collector_Contact || '';
                    const collectorCnic = latestStatus?.Collector_Cnic || '';

                    const updateFields = {
                        status: latestStatus?.Status || order.status,
                        latest_courier_status: statusReason,
                        last_tracking_update: new Date(),
                    };

                    if (status.includes("delivered")) updateFields.delivered_at = date;
                    if (status.includes("return")) updateFields.returned_at = date;

                    await Order.findByIdAndUpdate(order._id, updateFields);

                    const existingUpdate = await OrderUpdate.findOne({ orderId: order._id });

                    if (existingUpdate) {
                        // Check if the status already exists in the status_record
                        const statusExists = existingUpdate.status_record.includes(latestStatus?.Status);

                        if (!statusExists) {
                            // Update existing OrderUpdate
                            await OrderUpdate.findByIdAndUpdate(existingUpdate._id, {
                                $set: { last_tracking_update: new Date() },
                                $push: { status_record: latestStatus?.Status }
                            });
                        }
                    } else {
                        const updateDoc = new OrderUpdate({
                            orderId: order._id,
                            status_record: [latestStatus?.Status],
                            productInfo: {
                                OrderNumber: order.trackingNumber,
                                date: date || "Not Available",
                                CustomerName: order.customer_name || "Not Available",
                                Address: order.address || "Not Available",
                                OrderDetails: {
                                    ProductName: "Not Available",
                                    Quantity: "Not Available",
                                }
                            },
                            last_tracking_update: new Date(),
                            rawJson: {
                                Status: latestStatus?.Status,
                                Status_Reason: statusReason,
                                Date: date,
                                Remarks: remarks,
                                Collector_Name: collectorName,
                                Collector_Contact: collectorContact,
                                Collector_Cnic: collectorCnic,
                            }
                        });

                        await updateDoc.save();
                    }

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
                    const status = latest?.status?.toLowerCase() || order.status?.toLowerCase();
                    const timestamp = latest?.timestamp ? new Date(latest.timestamp * 1000) : new Date();

                    const updateFields = {
                        customer_name: details.consignee?.name || order.customer_name,
                        address: details.consignee?.address || order.address,
                        status: latest?.status || order.status,
                        last_tracking_update: timestamp,
                        latest_courier_status: latest?.status,
                        invoicePayment: details.order_information?.amount || order.invoicePayment,
                    };

                    if (status.includes('delivered')) updateFields.delivered_at = timestamp.toISOString();
                    if (status.includes('return')) updateFields.returned_at = timestamp.toISOString();

                    await Order.findByIdAndUpdate(order._id, updateFields);

                    const existingUpdate = await OrderUpdate.findOne({ orderId: order._id });

                    if (existingUpdate) {
                        // Check if the status already exists in the status_record
                        const statusExists = existingUpdate.status_record.includes(latest?.status);

                        if (!statusExists) {
                            // Update existing OrderUpdate
                            await OrderUpdate.findByIdAndUpdate(existingUpdate._id, {
                                $set: { last_tracking_update: timestamp },
                                $push: { status_record: latest?.status }
                            });
                        }
                    } else {
                        const updateDoc = new OrderUpdate({
                            orderId: order._id,
                            status_record: trackingHistory,
                            productInfo: {
                                OrderNumber: details.order_id || order.trackingNumber,
                                date: details.order_date || "Not Available",
                                CustomerName: details.consignee?.name || "Not Available",
                                Address: details.consignee?.address || "Not Available",
                                OrderDetails: {
                                    ProductName: product.description || "Not Available",
                                    Quantity: product.quantity?.toString() || "Not Available"
                                }
                            },
                            last_tracking_update: timestamp,
                            rawJson: data
                        });

                        await updateDoc.save();
                    }

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
