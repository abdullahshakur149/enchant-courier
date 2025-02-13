import { Order, CompletedOrder, ReturnedOrder } from '../../models/order.js';
import fs from 'fs/promises';

export const submitOrder = async (req, res) => {
    try {
        console.log(req.body);
        const { trackingNumber, flyNumber } = req.body;

        if (!trackingNumber || !flyNumber) {
            return res.status(400).json({
                message: "Fill out all of the information"
            });
        }

        const orderExists = await Order.findOne({ trackingNumber })
        if (orderExists) {
            res.json({
                status: 'false',
                data: { message: 'Order already exists' }
            });
        }

        const newOrder = new Order({
            trackingNumber,
            flyerId: flyNumber
        });

        await newOrder.save();

        res.json({
            status: 'success',
            data: { message: 'Order submitted successfully' }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            data: { message: 'Please try again later.' }
        });
    }
};

export const getOrders = async () => {
    try {
        const orders = await Order.find();
        let information = [];

        try {
            const data = await fs.readFile('courier.json', 'utf8');
            information = JSON.parse(data);
        } catch (fileError) {
            console.error("Error reading courier.json:", fileError);
        }

        const mergedOrders = orders.map(order => {
            const courierInfo = information.orders.find(courier => courier.tracking_id === order.trackingNumber);
            return {
                ...order.toObject(),
                courierStatus: courierInfo ? courierInfo.status : 'Unknown'
            };
        });

        return { orders: mergedOrders, information };
    } catch (error) {
        console.error('Error in fetching orders:', error);
        return { orders: [], information: [] };
    }
};


export const updateOrder = async (req, res) => {
    const { orderId, trackingNumber, flyerId, courierStatus, status } = req.body;

    try {
        const existingOrder = await Order.findById(orderId);
        if (!existingOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (courierStatus === 'delivered' && status === 'payment_recieved') {
            const completedOrder = new CompletedOrder({
                trackingNumber: trackingNumber,
                flyerId: flyerId,
                status: status
            });
            await completedOrder.save();

            await Order.findByIdAndDelete(orderId);

            return res.status(200).json({ success: true, message: 'Order moved to completed orders' });
        }

        else if (courierStatus === 'returned' && status === 'return_recieved') {
            const returnedOrder = new ReturnedOrder({
                trackingNumber: trackingNumber,
                flyerId: flyerId,
                status: status
            });
            await returnedOrder.save();

            await Order.findByIdAndDelete(orderId);

            return res.status(200).json({ success: true, message: 'Order moved to returned orders' });
        }

        return res.status(400).json({ success: false, message: 'Invalid status update' });

    } catch (error) {
        console.error('Error updating order:', error);
        return res.status(500).json({ message: 'Internal server error' });
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

export const checkReturnedOrder = async (req, res) => {
    try {
        const { trackingNumber, flyNumber } = req.body;

        const order = await Order.findOne({ trackingNumber });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order does not exist" });
        }

        const orderExists = await ReturnedOrder.findOne({ trackingNumber });
        if (orderExists) {
            return res.json({ success: false, message: "Order already exists" });
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




