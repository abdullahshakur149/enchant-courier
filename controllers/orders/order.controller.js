import { Order, OrderUpdate } from '../../models/order.js';
import { formatDate } from '../../utils/helpers.js';


export const submitOrder = async (req, res) => {
    try {
        // console.log(req.body);
        const { trackingNumber, flyerNumber, courierType } = req.body;

        // Validate form data
        if (!trackingNumber || !flyerNumber || !courierType) {
            return res.json({
                success: false,
                message: 'Fill the form properly'
            });
        }
        // test

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



export const getOrders = async (page = 1, limit = 50) => {
    try {
        const skip = (page - 1) * limit;

        // Get orders with all necessary fields
        const orders = await Order.find({})
            .select('trackingNumber courierType flyerId customer_name address status delivered_at returned_at last_tracking_update latest_courier_status invoicePayment')
            .skip(skip)
            .limit(limit);

        const totalOrders = await Order.countDocuments();

        if (orders.length === 0) {
            return {
                trackingData: [],
                message: "No orders found.",
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalOrders / limit),
                    totalOrders,
                    limit
                }
            };
        }

        // Get latest updates for all orders
        const orderIds = orders.map(order => order._id);
        const latestUpdates = await OrderUpdate.find({
            orderId: { $in: orderIds }
        })
            .sort({ createdAt: -1 })
            .then(updates => {
                const latestByOrder = {};
                updates.forEach(update => {
                    if (!latestByOrder[update.orderId] ||
                        update.createdAt > latestByOrder[update.orderId].createdAt) {
                        latestByOrder[update.orderId] = update;
                    }
                });
                return latestByOrder;
            });

        // Format the response
        const trackingData = orders.map(order => {
            const latestUpdate = latestUpdates[order._id.toString()];
            const statusRecord = latestUpdate?.status_record || [];
            const latestStatus = statusRecord.length > 0 ? statusRecord[statusRecord.length - 1] : null;

            return {
                _id: order._id,
                trackingNumber: order.trackingNumber,
                courierType: order.courierType,
                flyerId: order.flyerId,
                customer_name: order.customer_name,
                address: order.address,
                status: order.status,
                delivered_at: order.delivered_at,
                returned_at: order.returned_at,
                last_tracking_update: order.last_tracking_update,
                latest_courier_status: order.latest_courier_status,
                invoicePayment: order.invoicePayment,
                productInfo: latestUpdate?.productInfo || {
                    OrderNumber: order.trackingNumber,
                    date: new Date().toISOString(),
                    CustomerName: order.customer_name || "Not Available",
                    Address: order.address || "Not Available",
                    OrderDetails: {
                        ProductName: "Not Available",
                        Quantity: "Not Available"
                    }
                },
                trackingResponse: {
                    status: latestStatus || order.status || "Not Available",
                    status_record: statusRecord,
                    rawJson: latestUpdate?.rawJson || {}
                },
                lastUpdated: latestUpdate?.last_tracking_update || order.last_tracking_update || null
            };
        });

        return {
            trackingData,
            message: "Orders retrieved successfully.",
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalOrders / limit),
                totalOrders,
                limit
            }
        };

    } catch (error) {
        console.error("Error fetching orders:", error.message);
        return {
            trackingData: [],
            message: "Error fetching orders.",
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalOrders: 0,
                limit
            }
        };
    }
};




// update order 
export const updateOrder = async (req, res) => {
    try {
        const { _id, ...updateFields } = req.body;

        // Validate _id
        if (!_id) {
            return res.json({
                success: false,
                message: 'Order ID is required'
            });
        }

        // Check if order exists by _id
        const orderExists = await Order.findById(_id);
        if (!orderExists) {
            return res.json({
                success: false,
                message: 'Order does not exist'
            });
        }

        // Only update fields that are provided
        const updateData = {};
        if (updateFields.trackingNumber) updateData.trackingNumber = updateFields.trackingNumber;
        if (updateFields.flyerId) updateData.flyerId = updateFields.flyerId;
        if (updateFields.courierType) updateData.courierType = updateFields.courierType;

        // Update order using _id
        await Order.findByIdAndUpdate(_id, updateData);

        // If tracking number or courier type changed, we should create a new OrderUpdate
        if (updateFields.trackingNumber || updateFields.courierType) {
            const orderUpdate = new OrderUpdate({
                orderId: _id,
                latestStatus: orderExists.status || "Status Updated",
                productInfo: orderExists.productInfo || {},
                rawJson: { updatedFields: updateFields }
            });
            await orderUpdate.save();
        }

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
        const { id } = req.params;

        // Validate form data
        if (!id) {
            return res.json({
                success: false,
                message: 'Order ID is required'
            });
        }

        // Check if order exists
        const orderExists = await Order.findById(id);
        if (!orderExists) {
            return res.json({
                success: false,
                message: 'Order does not exist'
            });
        }

        // Delete all related OrderUpdate records first
        await OrderUpdate.deleteMany({ orderId: id });

        // Delete the order
        await Order.deleteOne({ _id: id });

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








export const getMonthlyStats = async (req, res) => {
    try {
        // Get current month's start and end dates
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date();
        endOfMonth.setHours(23, 59, 59, 999);

        // Get all orders for the current month
        const orders = await Order.find({
            createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        });

        // Calculate statistics based on latest_courier_status
        const deliveredOrders = orders.filter(order => 
            order.latest_courier_status?.toLowerCase().includes('delivered')
        );
        const returnedOrders = orders.filter(order => 
            order.latest_courier_status?.toLowerCase().includes('return')
        );
        const activeOrders = orders.filter(order => 
            !order.latest_courier_status?.toLowerCase().includes('delivered') && 
            !order.latest_courier_status?.toLowerCase().includes('return')
        );

        // Calculate total revenue from delivered orders
        const totalRevenue = deliveredOrders.reduce((sum, order) => 
            sum + (order.invoicePayment || 0), 0);

        const stats = {
            activeCount: activeOrders.length,
            deliveredCount: deliveredOrders.length,
            returnedCount: returnedOrders.length,
            totalOrders: orders.length,
            totalRevenue: totalRevenue,
            byCourier: {
                postex: orders.filter(order => order.courierType === 'postex').length,
                daewoo: orders.filter(order => order.courierType === 'daewoo').length,
                trax: orders.filter(order => order.courierType === 'trax').length
            }
        };

        return {
            success: true,
            stats
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            success: false,
            message: 'Please try again later.'
        };
    }
};





