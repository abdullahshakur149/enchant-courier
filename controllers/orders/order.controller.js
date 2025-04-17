import { Order } from '../../models/order.js';
import { formatDate } from '../../utils/helpers.js';

// ===================================== submit order ===============================================
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



// ===================================== get order ===============================================

export const getOrders = async (page = 1, limit = 50) => {
    try {
        const skip = (page - 1) * limit;

        // Find orders that are not delivered and not returned
        const orders = await Order.find({
            $and: [
                { $or: [{ isDelivered: { $exists: false } }, { isDelivered: false }] },
                { $or: [{ isReturned: { $exists: false } }, { isReturned: false }] }
            ]
        })
            .select('trackingNumber courierType flyerId customer_name address status delivered_at returned_at last_tracking_update latest_courier_status invoicePayment status_record productInfo rawJson')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalOrders = await Order.countDocuments({
            $and: [
                { $or: [{ isDelivered: { $exists: false } }, { isDelivered: false }] },
                { $or: [{ isReturned: { $exists: false } }, { isReturned: false }] }
            ]
        });

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

        // Format the response
        const trackingData = orders.map(order => {
            // Initialize status_record if it doesn't exist
            const statusRecord = Array.isArray(order.status_record) ? order.status_record : [];
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
                productInfo: order.productInfo || {
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
                },
                lastUpdated: order.last_tracking_update || null,
                createdAt: order.createdAt
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





// ===================================== update order ===============================================
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

        // Initialize status_record if it doesn't exist
        if (!orderExists.status_record) {
            orderExists.status_record = [];
        }

        // Only update fields that are provided
        const updateData = {};
        if (updateFields.trackingNumber) updateData.trackingNumber = updateFields.trackingNumber;
        if (updateFields.flyerId) updateData.flyerId = updateFields.flyerId;
        if (updateFields.courierType) updateData.courierType = updateFields.courierType;
        if (updateFields.status) updateData.status = updateFields.status;
        if (updateFields.delivered_at) updateData.delivered_at = updateFields.delivered_at;
        if (updateFields.returned_at) updateData.returned_at = updateFields.returned_at;
        if (updateFields.last_tracking_update) updateData.last_tracking_update = updateFields.last_tracking_update;
        if (updateFields.latest_courier_status) updateData.latest_courier_status = updateFields.latest_courier_status;
        if (updateFields.invoicePayment) updateData.invoicePayment = updateFields.invoicePayment;

        // Update status_record, productInfo, or rawJson if these fields are part of the update
        if (updateFields.status_record) {
            // Ensure status_record is an array
            const newStatuses = Array.isArray(updateFields.status_record)
                ? updateFields.status_record
                : [updateFields.status_record];

            // Only add new statuses that don't already exist
            const uniqueNewStatuses = newStatuses.filter(status =>
                status && !orderExists.status_record.includes(status)
            );

            updateData.status_record = [...orderExists.status_record, ...uniqueNewStatuses];
        }

        if (updateFields.productInfo) {
            updateData.productInfo = {
                ...orderExists.productInfo,
                ...updateFields.productInfo
            };
        }

        if (updateFields.rawJson) {
            updateData.rawJson = {
                ...orderExists.rawJson,
                ...updateFields.rawJson
            };
        }

        // Update order using _id with the gathered data
        await Order.findByIdAndUpdate(_id, updateData);

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
};

// ===================================== delete order ===============================================
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
};



// ===================================== get delivered orders order ===============================================

export const deliveredOrder = async (page = 1, limit = 50) => {
    try {
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ isDelivered: true });
        const orders = await Order.find({ isDelivered: true })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        // Map orders to include trackingResponse
        const trackingData = orders.map(order => ({
            ...order.toObject(),
            trackingResponse: {
                status_record: [{
                    status: 'Delivered',
                    date: order.updatedAt || order.createdAt
                }]
            },
            latest_courier_status: 'Delivered'
        }));

        const totalPages = Math.ceil(totalOrders / limit);

        return {
            trackingData,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: page,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    } catch (error) {
        console.error("Error in deliveredOrder:", error);
        return {
            trackingData: [],
            pagination: {
                totalOrders: 0,
                totalPages: 0,
                currentPage: page,
                hasNextPage: false,
                hasPrevPage: false,
            },
        };
    }
};

// change
















