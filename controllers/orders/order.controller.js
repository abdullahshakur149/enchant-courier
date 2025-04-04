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

        let trackingData = [];

        // PostEx API Call
        if (postexTrackingNumbers.length > 0) {
            try {
                const postexApiUrl = "https://api.postex.pk/services/integration/api/order/v1/track-bulk-order";
                const postexResponse = await axios.get(postexApiUrl, {
                    headers: {
                        "token": process.env.POSTEXMERCHANT_KEY,
                        "Content-Type": "application/json"
                    },
                    params: { TrackingNumbers: postexTrackingNumbers },
                    paramsSerializer: { indexes: null }
                });

                if (postexResponse.data?.dist) {
                    const postexTrackingData = postexResponse.data.dist.map(item => {
                        const order = orders.find(order => order.trackingNumber === item.trackingNumber);
                        return {
                            trackingNumber: item.trackingNumber,
                            courierType: order ? order.courierType : null,
                            flyerId: order ? order.flyerId : null,
                            trackingResponse: item.trackingResponse
                        };
                    });
                    // Add PostEx tracking data to the final result
                    trackingData = [...trackingData, ...postexTrackingData];
                }

            } catch (error) {
                console.error("Error fetching PostEx tracking info:", error.response?.data || error.message);
            }
        }

        // Daewoo API Call (fetch one by one since their API does not support bulk tracking)
        if (daewooTrackingNumbers.length > 0) {
            try {
                const daewooBaseUrl = "https://codapi.daewoo.net.pk/api/booking/quickTrack?trackingNo=";
                const daewooResponses = await Promise.all(
                    daewooTrackingNumbers.map(async (trackingNo) => {
                        try {
                            const daewooResponse = await axios.get(`${daewooBaseUrl}${trackingNo}`);
                            const order = orders.find(order => order.trackingNumber === trackingNo);

                            // Extract tracking details safely
                            const trackingResult = daewooResponse.data?.Result || {};
                            const trackingDetails = trackingResult.TrackingDetails || [];

                            // Get the latest status (last entry in TrackingDetails array)
                            const latestStatus = trackingDetails.length > 0
                                ? trackingDetails[trackingDetails.length - 1]  // Last status update
                                : { Status: "N/A", Status_Reason: "No Tracking Info" };

                            return {
                                trackingNumber: trackingNo,
                                courierType: "Daewoo",
                                flyerId: order ? order.flyerId : null,
                                trackingResponse: {
                                    status: latestStatus.Status,
                                    reason: latestStatus.Status_Reason,
                                    terminal: latestStatus.TransactionTerminal,
                                    date: latestStatus.Date
                                }
                            };
                        } catch (error) {
                            console.error(`Error fetching Daewoo tracking for ${trackingNo}:`, error.response?.data || error.message);
                            return null;
                        }
                    })
                );

                trackingData = [...trackingData, ...daewooResponses.filter(data => data !== null)];
            } catch (error) {
                console.error("Error fetching Daewoo tracking info:", error.response?.data || error.message);
            }
        }

        // Trax API Call
        if (traxTrackingNumbers.length > 0) {
            try {
                const traxBaseUrl = "https://sonic.pk/api/shipment/track";
                const traxResponses = await Promise.all(
                    traxTrackingNumbers.map(async (trackingNo) => {
                        try {
                            // Send GET request to Trax API
                            const traxResponse = await axios.get(traxBaseUrl, {
                                headers: {
                                    Authorization: process.env.TRAXMERCHANT_KEY,
                                },
                                params: {
                                    tracking_number: trackingNo,
                                    type: 0
                                }
                            });

                            // Extract tracking history (ensure this field exists and is an array)
                            const history = traxResponse.data?.details?.tracking_history || [];

                            // If history is empty, log a message
                            if (history.length === 0) {
                                console.log(`No tracking history found for ${trackingNo}`);
                            }

                            // Get the latest status (first element in the history array)
                            const latestStatus = history.length > 0 ? history[0].status : "No tracking info";

                            const order = orders.find(order => order.trackingNumber === trackingNo);
                            return {
                                trackingNumber: trackingNo,
                                courierType: "Trax",
                                flyerId: order?.flyerId || null,
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

                trackingData = [...trackingData, ...traxResponses.filter(data => data !== null)];
            } catch (error) {
                console.error("Error fetching Trax tracking info:", error.response?.data || error.message);
            }
        }

        return { trackingData, message: "Orders fetched successfully." };

    } catch (error) {
        console.error("Error fetching orders:", error.response?.data || error.message);
        return { trackingData: [], message: "Error fetching orders." };
    }
};








export const getCompletedOrders = async (req, res) => {
    try {
        const completedOrders = await CompletedOrder.find()
        return completedOrders;
    } catch (error) {
    }
}

// controllers
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

        const orderExists = await ReturnedOrder.findOne({ trackingNumber, flyNumber });
        if (orderExists) {
            return res.json({ success: false, message: "Order already exists" });
        }

        const order = await Order.findOne({ trackingNumber, flyNumber });

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

        res.json({ success: true, message: "Order moved to returned orders successfully", order: returnedOrder });

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




