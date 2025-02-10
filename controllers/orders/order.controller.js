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
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check the conditions for moving the order
        if (courierStatus === 'delivered' && status === 'payment_recieved') {
            // Move order to CompletedOrder
            const completedOrder = new CompletedOrder({ orderId });
            await completedOrder.save();

            // Delete from Order collection
            await Order.findByIdAndDelete(orderId);

            return res.status(200).json({ message: 'Order moved to completed orders' });
        }

        else if (courierStatus === 'returned' && status === 'return_recieved') {
            const returnedOrder = new ReturnedOrder({ orderId });
            await returnedOrder.save();

            await Order.findByIdAndDelete(orderId);

            return res.status(200).json({ message: 'Order moved to returned orders' });
        }

        return res.status(400).json({ message: 'Invalid status update' });

    } catch (error) {
        console.error('Error updating order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
