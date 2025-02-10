import Order from '../../models/order.js';
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
                courierStatus: courierInfo ? courierInfo.status.label : 'Unknown'
            };
        });

        return { orders: mergedOrders, information };
    } catch (error) {
        console.error('Error in fetching orders:', error);
        return { orders: [], information: [] };
    }
};
