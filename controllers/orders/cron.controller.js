import { Order, OrderUpdate, CompletedOrder } from '../../models/order.js';
import { formatDate } from '../../utils/helpers.js';
import axios from 'axios';

export const updateOrderStatuses = async (req, res) => {
    try {
        console.log("Starting order status update process...");

        // Get all active orders
        const orders = await Order.find({}, "trackingNumber courierType flyerId");
        console.log(`Found ${orders.length} orders to update`);

        // Process PostEx orders
        const postexOrders = orders.filter(order => order.courierType.toLowerCase() === "postex");
        if (postexOrders.length > 0) {
            console.log(`Processing ${postexOrders.length} PostEx orders`);
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
                // changes pushed

                await Promise.all(postexResponse.data.dist.map(async (item) => {
                    const order = postexOrders.find(o => o.trackingNumber === item.trackingNumber);
                    const data = item.trackingResponse || {};
                    const status = data.transactionStatus || "";

                    const trackingInfo = {
                        status: status,
                        productInfo: {
                            OrderNumber: data.orderRefNumber || "Not Available",
                            date: formatDate(data.transactionDate || "Not Available"),
                            CustomerName: data.customerName || "Not Available",
                            Address: data?.deliveryAddress || "Not Available",
                            OrderDetails: {
                                ProductName: data.orderDetail || "Not Available",
                                Quantity: data.items?.toString() || "Not Available",
                            }
                        }
                    };

                    if (status.toLowerCase().includes("delivered")) {
                        // Create completed order
                        const completedOrder = new CompletedOrder({
                            trackingNumber: order.trackingNumber,
                            flyerId: order.flyerId,
                            courierType: order.courierType,
                            latestStatus: status,
                            productInfo: trackingInfo.productInfo
                        });
                        await completedOrder.save();
                        // console.log(`Moved PostEx order ${order.trackingNumber} to completed orders`);

                        // Delete from active orders
                        await Order.deleteOne({ _id: order._id });
                        // console.log(`Deleted PostEx order ${order.trackingNumber} from active orders`);
                    } else {
                        // Find existing OrderUpdate or create new one
                        let orderUpdate = await OrderUpdate.findOne({ orderId: order._id });

                        if (orderUpdate) {
                            const currentHistory = orderUpdate.rawJson?.history || [];
                            const newStatus = {
                                status: status,
                                timestamp: new Date(),
                                productInfo: trackingInfo.productInfo
                            };

                            if (orderUpdate.latestStatus !== status) {
                                orderUpdate.rawJson = {
                                    ...orderUpdate.rawJson,
                                    history: [...currentHistory, newStatus]
                                };
                                orderUpdate.latestStatus = status;
                                orderUpdate.productInfo = trackingInfo.productInfo;
                                orderUpdate.updatedAt = new Date();
                                orderUpdate.last_tracking_update = new Date();
                                await orderUpdate.save();
                                console.log(`Updated existing status for PostEx order ${order.trackingNumber}`);
                            }
                        } else {
                            // Create new OrderUpdate with initial history
                            orderUpdate = new OrderUpdate({
                                orderId: order._id,
                                latestStatus: status,
                                productInfo: trackingInfo.productInfo,
                                last_tracking_update: new Date(),
                                rawJson: {
                                    history: [{
                                        status: status,
                                        timestamp: new Date(),
                                        productInfo: trackingInfo.productInfo
                                    }]
                                }
                            });
                            await orderUpdate.save();
                            console.log(`Created new status update for PostEx order ${order.trackingNumber}`);
                        }
                    }
                }));
            } catch (error) {
                console.error("Error updating PostEx orders:", error);
            }
        }

        // Process Daewoo orders
        const daewooOrders = orders.filter(order => order.courierType.toLowerCase() === "daewoo");
        if (daewooOrders.length > 0) {
            console.log(`Processing ${daewooOrders.length} Daewoo orders`);
            await Promise.all(daewooOrders.map(async (order) => {
                try {
                    const daewooBaseUrl = process.env.DAEWOOAPI_URL;
                    const daewooResponse = await axios.get(`${daewooBaseUrl}${order.trackingNumber}`);
                    const trackingResult = daewooResponse.data?.Result || {};
                    const trackingDetails = trackingResult.TrackingDetails || [];
                    const latestStatus = trackingDetails.length > 0 ? trackingDetails[trackingDetails.length - 1] : null;
                    const status = latestStatus?.Status || "";

                    const trackingInfo = {
                        status: status,
                        productInfo: {
                            OrderNumber: trackingResult.OrderNumber || "No Order Number",
                            date: trackingResult.Date || trackingDetails[0]?.Date || "No Booking Date",
                            CustomerName: trackingResult.CustomerName || "No Customer Name",
                            OrderDetails: {
                                ProductName: trackingResult.ProductName || "No Product Name",
                                Quantity: trackingResult.Quantity || "No Quantity",
                            }
                        }
                    };

                    // Check delivery status first
                    if (status.toLowerCase().includes("delivered")) {
                        // Create completed order
                        const completedOrder = new CompletedOrder({
                            trackingNumber: order.trackingNumber,
                            flyerId: order.flyerId,
                            courierType: order.courierType,
                            latestStatus: status,
                            productInfo: trackingInfo.productInfo
                        });
                        await completedOrder.save();
                        console.log(`Moved Daewoo order ${order.trackingNumber} to completed orders`);

                        // Delete from active orders
                        await Order.deleteOne({ _id: order._id });
                        console.log(`Deleted Daewoo order ${order.trackingNumber} from active orders`);
                    } else {
                        // Find existing OrderUpdate or create new one
                        let orderUpdate = await OrderUpdate.findOne({ orderId: order._id });

                        if (orderUpdate) {
                            // Update existing OrderUpdate and store history
                            const currentHistory = orderUpdate.rawJson?.history || [];
                            const newStatus = {
                                status: status,
                                timestamp: new Date(),
                                productInfo: trackingInfo.productInfo
                            };

                            // Only add to history if status has changed
                            if (orderUpdate.latestStatus !== status) {
                                orderUpdate.rawJson = {
                                    ...orderUpdate.rawJson,
                                    history: [...currentHistory, newStatus]
                                };
                                orderUpdate.latestStatus = status;
                                orderUpdate.productInfo = trackingInfo.productInfo;
                                orderUpdate.updatedAt = new Date();
                                orderUpdate.last_tracking_update = new Date();
                                await orderUpdate.save();
                                console.log(`Updated existing status for Daewoo order ${order.trackingNumber}`);
                            }
                        } else {
                            // Create new OrderUpdate with initial history
                            orderUpdate = new OrderUpdate({
                                orderId: order._id,
                                latestStatus: status,
                                productInfo: trackingInfo.productInfo,
                                last_tracking_update: new Date(),
                                rawJson: {
                                    history: [{
                                        status: status,
                                        timestamp: new Date(),
                                        productInfo: trackingInfo.productInfo
                                    }]
                                }
                            });
                            await orderUpdate.save();
                            console.log(`Created new status update for Daewoo order ${order.trackingNumber}`);
                        }
                    }
                } catch (error) {
                    console.error(`Error updating Daewoo order ${order.trackingNumber}:`, error);
                }
            }));
        }

        // Process Trax orders
        const traxOrders = orders.filter(order => order.courierType.toLowerCase() === "trax");
        if (traxOrders.length > 0) {
            console.log(`Processing ${traxOrders.length} Trax orders`);
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

                    const history = traxResponse.data?.details?.tracking_history || [];
                    const latestStatus = history.length > 0 ? history[0].status : "No tracking info";

                    const trackingInfo = {
                        status: latestStatus,
                        productInfo: {
                            OrderNumber: traxResponse.data?.details?.order_id || "No Order ID",
                            date: formatDate(traxResponse.data?.details?.booking_date),
                            CustomerName: traxResponse.data?.details?.consignee.name || "No Customer Name",
                            Address: traxResponse.data?.details?.consignee.address || "No Address",
                            OrderDetails: {
                                ProductName: traxResponse.data?.details?.order_information.items[0]?.description || "No Product Name",
                                Quantity: traxResponse.data?.details?.order_information.items[0]?.quantity || "No Quantity",
                            }
                        }
                    };

                    // Check delivery status first
                    if (latestStatus.toLowerCase().includes("delivered")) {
                        // Create completed order
                        const completedOrder = new CompletedOrder({
                            trackingNumber: order.trackingNumber,
                            flyerId: order.flyerId,
                            courierType: order.courierType,
                            latestStatus: latestStatus,
                            productInfo: trackingInfo.productInfo
                        });
                        await completedOrder.save();
                        // console.log(`Moved Trax order ${order.trackingNumber} to completed orders`);

                        // Delete from active orders
                        await Order.deleteOne({ _id: order._id });
                        // console.log(`Deleted Trax order ${order.trackingNumber} from active orders`);
                    } else {
                        // Find existing OrderUpdate or create new one
                        let orderUpdate = await OrderUpdate.findOne({ orderId: order._id });

                        if (orderUpdate) {
                            // Update existing OrderUpdate and store history
                            const currentHistory = orderUpdate.rawJson?.history || [];
                            const newStatus = {
                                status: latestStatus,
                                timestamp: new Date(),
                                productInfo: trackingInfo.productInfo
                            };

                            // Only add to history if status has changed
                            if (orderUpdate.latestStatus !== latestStatus) {
                                orderUpdate.rawJson = {
                                    ...orderUpdate.rawJson,
                                    history: [...currentHistory, newStatus]
                                };
                                orderUpdate.latestStatus = latestStatus;
                                orderUpdate.productInfo = trackingInfo.productInfo;
                                orderUpdate.updatedAt = new Date();
                                orderUpdate.last_tracking_update = new Date();
                                await orderUpdate.save();
                                // console.log(`Updated existing status for Trax order ${order.trackingNumber}`);
                            }
                        } else {
                            // Create new OrderUpdate with initial history
                            orderUpdate = new OrderUpdate({
                                orderId: order._id,
                                latestStatus: latestStatus,
                                productInfo: trackingInfo.productInfo,
                                last_tracking_update: new Date(),
                                rawJson: {
                                    history: [{
                                        status: latestStatus,
                                        timestamp: new Date(),
                                        productInfo: trackingInfo.productInfo
                                    }]
                                }
                            });
                            await orderUpdate.save();
                            // console.log(`Created new status update for Trax order ${order.trackingNumber}`);
                        }
                    }
                } catch (error) {
                    console.error(`Error updating Trax order ${order.trackingNumber}:`, error);
                }
            }));
        }

        // console.log("Order status update process completed");
        res.json({
            success: true,
            message: "Order statuses updated successfully",
            updatedOrders: orders.length
        });
    } catch (error) {
        console.error("Error in updateOrderStatuses:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update order statuses",
            error: error.message
        });
    }
}; 