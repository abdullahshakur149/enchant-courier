import Order from '../../models/order.js';

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

export const getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find()
        if (!orders) {
            // res.status(400).json({ success: false, message: 'no orders found' })
            console.log('no orders fount')
        }
        console.log(orders)
        // res.status(200).json({ success: true, orders })

        next();
    } catch (error) {
        console.log('error in server', error)
    }
}