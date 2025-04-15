import { Order, OrderUpdate } from '../../models/order.js';
import { formatDate } from '../../utils/helpers.js';
import axios from 'axios';

export const updateOrderStatuses = async (req, res) => {
    try {
        // Get all active orders
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
        
                    try {
                        await Order.findByIdAndUpdate(order._id, {
                            customer_name: data.customerName || order.customer_name,
                            address: data.deliveryAddress || order.address,
                            status: data.transactionStatus || order.status,
                            invoicePayment: data.invoicePayment || order.invoicePayment,
                            last_tracking_update: new Date()
                        });
        
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
                            last_tracking_update: new Date(),
                            rawJson: data
                        });
        
                        await updateDoc.save();
                        // console.log('done')

        
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
                    const status = latestStatus?.Status || '';
                    const statusReason = latestStatus?.Status_Reason || '';
                    const date = latestStatus?.Date || null;
                    const remarks = latestStatus?.Rem || '';
                    const collectorName = latestStatus?.Collector_Name || '';
                    const collectorContact = latestStatus?.Collector_Contact || '';
                    const collectorCnic = latestStatus?.Collector_Cnic || '';
                    
                    // 1. Update the Order model with new tracking information
                    await Order.findByIdAndUpdate(order._id, {
                        status: status || order.status,
                        delivered_at: status === 'DELIVERED' ? date : order.delivered_at,
                        returned_at: status === 'RETURNED' ? date : order.returned_at,
                        latest_courier_status: statusReason,
                        last_tracking_update: new Date(),
                    });
        
                    // 2. Create a new update in the OrderUpdate model
                    const updateDoc = new OrderUpdate({
                        orderId: order._id,
                        status_record: [status], 
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
                            Status: status,
                            Status_Reason: statusReason,
                            Date: date,
                            Remarks: remarks,
                            Collector_Name: collectorName,
                            Collector_Contact: collectorContact,
                            Collector_Cnic: collectorCnic,
                        }
                    });
        
                    await updateDoc.save();
                    // console.log('done')

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
                    const status = latest?.status || order.status;
                    const timestamp = latest?.timestamp ? new Date(latest.timestamp * 1000) : new Date();
        
                    // 1. Update the order
                    await Order.findByIdAndUpdate(order._id, {
                        customer_name: details.consignee?.name || order.customer_name,
                        address: details.consignee?.address || order.address,
                        status,
                        last_tracking_update: timestamp,
                        latest_courier_status: status,
                        invoicePayment: details.order_information?.amount || order.invoicePayment,
                        delivered_at: status.toLowerCase().includes("delivered") ? timestamp.toISOString() : order.delivered_at,
                        returned_at: status.toLowerCase().includes("return") ? timestamp.toISOString() : order.returned_at
                    });
        
                    // 2. Save in OrderUpdates
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
                    // console.log('done')
                    
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
