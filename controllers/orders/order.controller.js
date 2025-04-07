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

        // Group orders by courierType
        const groupedOrders = orders.reduce((acc, order) => {
            const { courierType, trackingNumber } = order;
            if (!acc[courierType]) acc[courierType] = [];
            acc[courierType].push({ trackingNumber, flyerId: order.flyerId });
            return acc;
        }, {});

        // Prepare tracking numbers
        const postexTrackingNumbers = groupedOrders["postex"] || [];
        const daewooTrackingNumbers = groupedOrders["daewoo"] || [];
        const traxTrackingNumbers = groupedOrders["trax"] || [];

        let trackingData = [];

        // Fetch data for each courier concurrently
        const fetchPostexData = postexTrackingNumbers.length > 0
            ? axios.get("https://api.postex.pk/services/integration/api/order/v1/track-bulk-order", {
                headers: {
                    "token": process.env.POSTEXMERCHANT_KEY,
                    "Content-Type": "application/json"
                },
                params: { TrackingNumbers: postexTrackingNumbers.map(order => order.trackingNumber) },
                paramsSerializer: { indexes: null }
            })
            : Promise.resolve({ data: { dist: [] } });

        const fetchDaewooData = daewooTrackingNumbers.length > 0
            ? Promise.all(daewooTrackingNumbers.map(async ({ trackingNumber, flyerId }) => {
                try {
                    const daewooResponse = await axios.get(`https://codapi.daewoo.net.pk/api/booking/quickTrack?trackingNo=${trackingNumber}`);
                    const trackingResult = daewooResponse.data?.Result || {};
                    const trackingDetails = trackingResult.TrackingDetails || [];
                    const latestStatus = trackingDetails.length > 0 ? trackingDetails[trackingDetails.length - 1] : { Status: "N/A" };

                    return {
                        trackingNumber,
                        courierType: "Daewoo",
                        flyerId,
                        trackingResponse: {
                            status: latestStatus.Status,
                            reason: latestStatus.Status_Reason,
                        }
                    };
                } catch (error) {
                    console.error(`Error fetching Daewoo tracking for ${trackingNumber}:`, error.response?.data || error.message);
                    return null;
                }
            }))
            : Promise.resolve([]);

        const fetchTraxData = traxTrackingNumbers.length > 0
            ? Promise.all(traxTrackingNumbers.map(async ({ trackingNumber, flyerId }) => {
                try {
                    const traxResponse = await axios.get("https://sonic.pk/api/shipment/track", {
                        headers: {
                            Authorization: process.env.TRAXMERCHANT_KEY,
                        },
                        params: {
                            tracking_number: trackingNumber,
                            type: 0
                        }
                    });
                    const history = traxResponse.data?.details?.tracking_history || [];
                    const latestStatus = history.length > 0 ? history[0].status : "No tracking info";

                    return {
                        trackingNumber,
                        courierType: "Trax",
                        flyerId,
                        trackingResponse: { status: latestStatus }
                    };
                } catch (error) {
                    console.error(`Error fetching Trax tracking for ${trackingNumber}:`, error.response?.data || error.message);
                    return null;
                }
            }))
            : Promise.resolve([]);

        // Wait for all API calls to resolve
        const [postexResponse, daewooResponses, traxResponses] = await Promise.all([fetchPostexData, fetchDaewooData, fetchTraxData]);

        // Process PostEx tracking data
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
            trackingData = [...trackingData, ...postexTrackingData];
        }

        // Process Daewoo and Trax data
        trackingData = [
            ...trackingData,
            ...daewooResponses.filter(data => data !== null),
            ...traxResponses.filter(data => data !== null)
        ];

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




