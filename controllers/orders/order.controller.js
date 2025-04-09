import { Order, CompletedOrder, ReturnedOrder } from '../../models/order.js';
import axios from 'axios';

export const submitOrder = async (req, res) => {
    try {
        console.log(req.body);
        const { trackingNumber, flyerNumber, courierType } = req.body;

        // Validate form data
        if (!trackingNumber || !flyerNumber || !courierType) {
            return res.json({
                success: false,
                message: 'Fill the form properly'
            });
        }

        // Check if order already exists
        const orderExists = await Order.findOne({ trackingNumber, flyerId: flyerNumber });
        if (orderExists) {
            return res.json({
                success: false,
                message: 'Order already exists'
            });
        }

        // Save new order
        const newOrder = new Order({
            trackingNumber,
            flyerId: flyerNumber,
            courierType
        });

        await newOrder.save();

        return res.json({
            success: true,
            message: 'Order submitted successfully'
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Please try again later.'
        });
    }
};


// change



export const getOrders = async () => {
    try {
        const orders = await Order.find({}, "trackingNumber courierType flyerId");

        if (orders.length === 0) {
            return { trackingData: [], message: "No orders found." };
        }

        const postexTrackingNumbers = orders
            .filter(order => order.courierType.toLowerCase() === "postex")
            .map(order => order.trackingNumber);

        const daewooTrackingNumbers = orders
            .filter(order => order.courierType.toLowerCase() === "daewoo")
            .map(order => order.trackingNumber);

        const traxTrackingNumbers = orders
            .filter(order => order.courierType.toLowerCase() === "trax")
            .map(order => order.trackingNumber);

        const postexPromise = (async () => {
            if (postexTrackingNumbers.length === 0) return [];
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
                // console.log("this is the postex response:");
                // postexResponse.data.dist.forEach(item => {
                //     // console.log("Tracking Number:", item.trackingNumber);
                //     // console.log("Message:", item.message);
                //     if (item.trackingResponse) {
                //         console.log("Tracking Response:", item.trackingResponse);
                //     } else {
                //         console.log("No tracking response available.");
                //     }
                // });

                if (postexResponse.data?.dist) {
                    return postexResponse.data.dist.map(item => {
                        const order = orders.find(order => order.trackingNumber === item.trackingNumber);
                        const data = item.trackingResponse || {};
                        // console.log(data)

                        const productInfo = {
                            OrderNumber: data.orderRefNumber || "Not Available",
                            date: data.transactionDate || "Not Available",
                            CustomerName: data.customerName || "Not Available",
                            OrderDetails: {
                                ProductName: data.orderDetail || "Not Available",
                                Quantity: data.items?.toString() || "Not Available",
                            }
                        };
                        const trackingResponse = {
                            status: order.trackingResponse.transactionStatus,
                        }

                        return {
                            _id: order._id,
                            trackingNumber: item.trackingNumber,
                            courierType: order?.courierType || null,
                            flyerId: order?.flyerId || null,
                            productInfo: productInfo,
                            trackingResponse: trackingResponse,
                        };
                    });
                }

                return [];
            } catch (error) {
                console.error("Error fetching PostEx tracking info:", error.response?.data || error.message);
                return [];
            }
        })();

        const daewooPromise = (async () => {
            if (daewooTrackingNumbers.length === 0) return [];
            try {
                const daewooBaseUrl = process.env.DAEWOOAPI_URL;
                const daewooResponses = await Promise.all(
                    daewooTrackingNumbers.map(async (trackingNo) => {
                        try {
                            const daewooResponse = await axios.get(`${daewooBaseUrl}${trackingNo}`);
                            const order = orders.find(order => order.trackingNumber === trackingNo);
                            // console.log('here is the data', daewooResponse.data)
                            // console.log(daewooResponse.data.Result)
                            const trackingResult = daewooResponse.data?.Result || {};
                            // console.log('this is the result', trackingResult)
                            const trackingDetails = trackingResult.TrackingDetails || [];
                            let latestStatus;
                            if (trackingDetails.length > 0) {
                                latestStatus = trackingDetails[trackingDetails.length - 1];
                            } else {
                                return null;
                            }
                            if (latestStatus?.Status?.toLowerCase().includes("delivered") && order) {
                                await CompletedOrder.create(order.toObject());
                                await Order.deleteOne({ _id: order._id });
                                // console.log(`Order ${order.trackingNumber} moved to CompletedOrders and removed from Orders.`);
                            }

                            const productInfo = {
                                OrderNumber: trackingResult.OrderNumber || "No Order Number",
                                CustomerName: trackingResult.CustomerName || "No Customer Name",
                                OrderDetails: {
                                    ProductName: trackingResult.ProductName || "No Product Name",
                                    Quantity: trackingResult.Quantity || "No Quantity",
                                },
                                date: trackingResult.Date.toString() || "No Date",

                            }

                            const trackingResponse = {
                                status: latestStatus.Status,
                            };


                            return {
                                _id: order._id,
                                trackingNumber: trackingNo,
                                courierType: "Daewoo",
                                flyerId: order?.flyerId || null,
                                trackingResponse,
                                productInfo: productInfo,

                            };
                        } catch (error) {
                            console.error(`Error fetching Daewoo tracking for ${trackingNo}:`, error.response?.data || error.message);
                            return null;
                        }
                    })
                );

                return daewooResponses.filter(data => data !== null);
            } catch (error) {
                console.error("Error fetching Daewoo tracking info:", error.response?.data || error.message);
                return [];
            }
        })();

        const traxPromise = (async () => {
            if (traxTrackingNumbers.length === 0) return [];
            try {
                const traxBaseUrl = process.env.TRAXAPI_URL;
                const traxResponses = await Promise.all(
                    traxTrackingNumbers.map(async (trackingNo) => {
                        try {
                            const traxResponse = await axios.get(traxBaseUrl, {
                                headers: {
                                    Authorization: process.env.TRAXMERCHANT_KEY,
                                },
                                params: {
                                    tracking_number: trackingNo,
                                    type: 0
                                }
                            });
                            // console.log('this is the trax response', traxResponse.data?.details?.order_information.items)


                            const history = traxResponse.data?.details?.tracking_history || [];
                            // console.log('this is the history', history)
                            const latestStatus = history.length > 0 ? history[0].status : "No tracking info";

                            const order = orders.find(order => order.trackingNumber === trackingNo);

                            if (latestStatus?.toLowerCase().includes("delivered") && order) {
                                await CompletedOrder.create(order.toObject());
                                await Order.deleteOne({ _id: order._id });
                                console.log(`Order ${order.trackingNumber} moved to CompletedOrders and removed from Orders.`);
                            }
                            const productInfo = {
                                OrderNumber: traxResponse.data?.details?.order_id || "No Order ID",
                                date: traxResponse.data?.details?.booking_date.toString() || "No Booking Date",
                                CustomerName: traxResponse.data?.details?.consignee.name || "No Customer Name",
                                OrderDetails: {
                                    ProductName: traxResponse.data?.details?.order_information.items.product_type || "No Product Name",
                                    Quantity: traxResponse.data?.details?.order_information.items.quantity || "No Quantity",
                                }

                            }


                            return {
                                _id: order._id,
                                trackingNumber: trackingNo,
                                courierType: "Trax",
                                flyerId: order?.flyerId || null,
                                productInfo: productInfo,
                                trackingResponse: {
                                    status: latestStatus,
                                }
                            };
                        } catch (error) {
                            console.error(`Error fetching Trax tracking for ${trackingNo}:`, error.response?.data || error.message);
                            return null;
                        }
                    })
                );

                return traxResponses.filter(data => data !== null);
            } catch (error) {
                console.error("Error fetching Trax tracking info:", error.response?.data || error.message);
                return [];
            }
        })();

        // Run all courier promises in parallel
        const [postexData, daewooData, traxData] = await Promise.all([
            postexPromise,
            daewooPromise,
            traxPromise
        ]);

        const trackingData = [...postexData, ...daewooData, ...traxData];
        // console.log("Tracking Data:", trackingData);

        return { trackingData, message: "Orders fetched successfully." };

    } catch (error) {
        console.error("Error fetching orders:", error.response?.data || error.message);
        return { trackingData: [], message: "Error fetching orders." };
    }
};





// update order 
export const updateOrder = async (req, res) => {
    try {
        const { trackingNumber, flyerId, courierType } = req.body;

        // Validate form data
        if (!trackingNumber || !flyerId || !courierType) {
            return res.json({
                success: false,
                message: 'Fill the form properly'
            });
        }

        // Check if order already exists
        const orderExists = await Order.findOne({ trackingNumber, flyerId });
        if (!orderExists) {
            return res.json({
                success: false,
                message: 'Order does not exist'
            });
        }

        // Update order
        await Order.updateOne({ trackingNumber, flyerId }, { courierType });

        return res.json({
            success: true,
            message: 'Order updated successfully'
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Please try again later.'
        });
    }
}

// delete order
export const deleteOrder = async (req, res) => {
    try {
        const { trackingNumber, flyerId } = req.body;

        // Validate form data
        if (!trackingNumber || !flyerId) {
            return res.json({
                success: false,
                message: 'Fill the form properly'
            });
        }

        // Check if order exists
        const orderExists = await Order.findOne({ trackingNumber, flyerId });
        if (!orderExists) {
            return res.json({
                success: false,
                message: 'Order does not exist'
            });
        }

        // Delete order
        await Order.deleteOne({ trackingNumber, flyerId });

        return res.json({
            success: true,
            message: 'Order deleted successfully'
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Please try again later.'
        });
    }
}

export const getCompletedOrders = async (req, res) => {
    try {
        const completedOrder = await CompletedOrder.find()
        return completedOrder;
    } catch (error) {
    }
}

// controllers updates
export const getReturnedOrders = async (req, res) => {
    try {
        const returnedOrders = await ReturnedOrder.find()
        return returnedOrders;
    } catch (error) {
    }
}

// check this later
export const verifyReturnedOrders = async (req, res) => {
    try {
        const { trackingNumber, flyNumber } = req.body;

        const orderExists = await ReturnedOrder.findOne({ trackingNumber, flyerId: flyNumber });
        if (orderExists) {
            return res.json({ success: false, message: "Order already exists" });
        }

        const order = await Order.findOne({ trackingNumber, flyerId: flyNumber });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order does not exist" });
        }


        const returnedOrder = new ReturnedOrder({
            trackingNumber: order.trackingNumber,
            flyerId: order.flyerId,
            status: "return_received",
            createdAt: order.createdAt,
            updatedAt: new Date()
        });

        await returnedOrder.save();

        await Order.deleteOne({ _id: order._id });

        res.json({ success: true, message: "Order moved to returned orders successfully" });

    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


export const verifyCompletedOrders = async (req, res) => {
    try {
        const { trackingNumber, flyNumber } = req.body;

        const orderExists = await ReturnedOrder.findOne({ trackingNumber, flyerId: flyNumber });
        if (orderExists) {
            return res.json({ success: false, message: "Order already exists" });
        }

        const order = await Order.findOne({ trackingNumber, flyerId: flyNumber });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order does not exist" });
        }


        const completedOrder = new CompletedOrder({
            trackingNumber: order.trackingNumber,
            flyerId: order.flyerId,
            status: "Delivered & Completed",
            createdAt: order.createdAt,
            updatedAt: new Date()
        });
        // changes done

        await completedOrder.save();

        await Order.deleteOne({ _id: order._id });

        res.json({ success: true, message: "Order moved to completed orders successfully" });

    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getMonthlyOrderStats = async () => {
    try {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        const dispatchedResult = await Order.aggregate([
            { $match: { status: "dispatched", createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $count: "count" }
        ]);
        const dispatchedCount = dispatchedResult.length > 0 ? dispatchedResult[0].count : 0;

        const returnedResult = await ReturnedOrder.aggregate([
            { $match: { status: "return_recieved", createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $count: "count" }
        ]);
        const returnedCount = returnedResult.length > 0 ? returnedResult[0].count : 0;

        const completedResult = await CompletedOrder.aggregate([
            { $match: { status: "payment_recieved", createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $count: "count" }
        ]);
        const completedCount = completedResult.length > 0 ? completedResult[0].count : 0;

        return { dispatchedCount, returnedCount, completedCount };
    } catch (error) {
        console.error("Error fetching order stats:", error);
        return { dispatchedCount: 0, returnedCount: 0, completedCount: 0 };
    }
};




