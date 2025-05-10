import { Order, ReturnedOrder } from '../../models/order.js';
// import { formatDate } from '../../utils/helpers.js';

// ===================================== submit order ===============================================
export const submitOrder = async (req, res) => {
    try {
        console.log('Received order data:', req.body);
        const { trackingNumber, flyerId, courierType } = req.body;

        // Validate required fields
        if (!trackingNumber || !flyerId || !courierType) {
            console.log('Missing required fields:', { trackingNumber, flyerId, courierType });
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields'
            });
        }

        // Check if order already exists
        const existingOrder = await Order.findOne({
            $or: [
                { trackingNumber: trackingNumber },
                { flyerId: flyerId }
            ]
        });

        if (existingOrder) {
            return res.status(400).json({
                success: false,
                message: 'An order with this tracking number or flyer number already exists'
            });
        }

        // Create new order
        const newOrder = new Order({
            trackingNumber: trackingNumber.trim(),
            flyerId: flyerId.trim(),
            courierType: courierType,
            status: 'pending',
            createdAt: new Date()
        });

        await newOrder.save();

        return res.status(201).json({
            success: true,
            message: 'Order submitted successfully',
            order: newOrder
        });

    } catch (error) {
        console.error('Error submitting order:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while submitting order'
        });
    }
};


// change



// ===================================== get order ===============================================

export const getOrders = async (page = 1, limit = 50) => {
    try {
        const skip = (page - 1) * limit;

        // Find orders that are neither delivered nor returned
        const orders = await Order.find({
            $and: [
                { $or: [{ isDelivered: { $exists: false } }, { isDelivered: false }] },
                { $or: [{ isReturned: { $exists: false } }, { isReturned: false }] }
            ]
        })
            .select('trackingNumber courierType flyerId status invoicePayment last_tracking_update isDelivered isReturned delivered_at returned_at rawJson productInfo')
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

        const trackingData = orders.map(order => {
            // Get tracking history based on courier type
            let trackingHistory = [];
            let latestStatus = order.status;

            if (order.courierType.toLowerCase() === 'trax' && order.rawJson?.details?.tracking_history) {
                trackingHistory = order.rawJson.details.tracking_history.map(item => ({
                    status: item.status,
                    timestamp: new Date(item.timestamp * 1000).toISOString(),
                    location: item.location || 'Not Available'
                }));
                latestStatus = trackingHistory[0]?.status || order.status;
            } else if (order.courierType.toLowerCase() === 'postex' && order.rawJson?.transactionStatusHistory) {
                trackingHistory = order.rawJson.transactionStatusHistory.map(item => ({
                    status: item.status,
                    timestamp: item.timestamp,
                    location: item.location || 'Not Available'
                }));
                latestStatus = trackingHistory[0]?.status || order.status;
            } else if (order.courierType.toLowerCase() === 'daewoo' && order.rawJson?.Status_Reason) {
                latestStatus = order.rawJson.Status_Reason;
            }

            return {
                _id: order._id,
                trackingNumber: order.trackingNumber,
                courierType: order.courierType,
                flyerId: order.flyerId,
                status: order.status,
                invoicePayment: order.invoicePayment,
                last_tracking_update: order.last_tracking_update,
                isDelivered: order.isDelivered,
                isReturned: order.isReturned,
                delivered_at: order.delivered_at,
                returned_at: order.returned_at,
                productInfo: order.productInfo || {
                    OrderNumber: order.trackingNumber,
                    date: new Date().toISOString(),
                    CustomerName: "Not Available",
                    Address: "Not Available",
                    OrderDetails: {
                        ProductName: "Not Available",
                        Quantity: "Not Available"
                    }
                },
                rawJson: order.rawJson,
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
    const { trackingNumber, flyerId, courierType } = req.body;

    // Log the order ID for debugging
    const { orderId } = req.params;
    // console.log('Order ID:', orderId);

    try {
        // Find the order by ID
        const order = await Order.findById(orderId);
        // console.log('Order found:', order);

        // If the order is not found, return a 404 error
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        // Update the order fields if the respective field is provided in the request body
        if (trackingNumber) {
            order.trackingNumber = trackingNumber;
        }
        if (flyerId) {
            order.flyerId = flyerId;
        }
        if (courierType) {
            order.courierType = courierType;
        }

        // Save the updated order
        const updatedOrder = await order.save();

        // console.log('Updated Order:', updatedOrder);

        res.json({ message: 'Tracking history updated successfully.', data: updatedOrder });
    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ error: 'Server error while updating tracking history.' });
    }
};



// ===================================== delete order ===============================================
export const deleteOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        console.log(orderId)

        // Validate form data
        if (!orderId) {
            return res.json({
                success: false,
                message: 'Order ID is required'
            });
        }

        // Check if order exists
        const orderExists = await Order.findById(orderId);
        if (!orderExists) {
            return res.json({
                success: false,
                message: 'Order does not exist'
            });
        }

        // Delete the order
        await Order.deleteOne({ _id: orderId });

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

        // Find orders that are delivered
        const orders = await Order.find({ isDelivered: true })
            .select('trackingNumber courierType flyerId status invoicePayment last_tracking_update isDelivered isReturned delivered_at returned_at rawJson productInfo')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalOrders = await Order.countDocuments({ isDelivered: true });

        if (orders.length === 0) {
            return {
                trackingData: [],
                message: "No delivered orders found.",
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
            // Get tracking history based on courier type
            let trackingHistory = [];
            let latestStatus = order.status;

            if (order.courierType.toLowerCase() === 'trax' && order.rawJson?.details?.tracking_history) {
                trackingHistory = order.rawJson.details.tracking_history.map(item => ({
                    status: item.status,
                    timestamp: new Date(item.timestamp * 1000).toISOString(),
                    location: item.location || 'Not Available'
                }));
                latestStatus = trackingHistory[0]?.status || order.status;
            } else if (order.courierType.toLowerCase() === 'postex' && order.rawJson?.transactionStatusHistory) {
                trackingHistory = order.rawJson.transactionStatusHistory.map(item => ({
                    status: item.status,
                    timestamp: item.timestamp,
                    location: item.location || 'Not Available'
                }));
                latestStatus = trackingHistory[0]?.status || order.status;
            } else if (order.courierType.toLowerCase() === 'daewoo' && order.rawJson?.Status_Reason) {
                latestStatus = order.rawJson.Status_Reason;
            }

            return {
                _id: order._id,
                trackingNumber: order.trackingNumber,
                courierType: order.courierType,
                flyerId: order.flyerId,
                status: order.status,
                invoicePayment: order.invoicePayment,
                last_tracking_update: order.last_tracking_update,
                isDelivered: order.isDelivered,
                isReturned: order.isReturned,
                delivered_at: order.delivered_at,
                returned_at: order.returned_at,
                productInfo: order.productInfo || {
                    OrderNumber: order.trackingNumber,
                    date: new Date().toISOString(),
                    CustomerName: "Not Available",
                    Address: "Not Available",
                    OrderDetails: {
                        ProductName: "Not Available",
                        Quantity: "Not Available"
                    }
                },
                rawJson: order.rawJson,
                lastUpdated: order.last_tracking_update || null,
                createdAt: order.createdAt
            };
        });

        return {
            trackingData,
            message: "Delivered orders retrieved successfully.",
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalOrders / limit),
                totalOrders,
                limit
            }
        };

    } catch (error) {
        console.error("Error fetching delivered orders:", error.message);
        return {
            trackingData: [],
            message: "Error fetching delivered orders.",
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalOrders: 0,
                limit
            }
        };
    }
};

// change


// ===================================== get returned orders  ===============================================

export const returnedOrder = async (page = 1, limit = 50) => {
    try {
        const skip = (page - 1) * limit;

        const returnedOrders = await Order.find({ isReturned: true })
            .skip(skip)
            .limit(limit)
            .sort({ returned_at: -1 }); // Or use any other field like `createdAt`

        const totalOrders = await Order.countDocuments({ isReturned: true });

        const trackingData = returnedOrders.map(order => {
            let trackingHistory = [];
            let latestStatus = order.status;

            if (order.courierType?.toLowerCase() === 'trax' && order.rawJson?.details?.tracking_history) {
                trackingHistory = order.rawJson.details.tracking_history.map(item => ({
                    status: item.status,
                    timestamp: new Date(item.timestamp * 1000).toISOString(),
                    location: item.location || 'Not Available'
                }));
                latestStatus = trackingHistory[0]?.status || order.status;
            } else if (order.courierType?.toLowerCase() === 'postex' && order.rawJson?.transactionStatusHistory) {
                trackingHistory = order.rawJson.transactionStatusHistory.map(item => ({
                    status: item.status,
                    timestamp: item.timestamp,
                    location: item.location || 'Not Available'
                }));
                latestStatus = trackingHistory[0]?.status || order.status;
            } else if (order.courierType?.toLowerCase() === 'daewoo' && order.rawJson?.Status_Reason) {
                latestStatus = order.rawJson.Status_Reason;
            }

            return {
                _id: order._id,
                trackingNumber: order.trackingNumber,
                courierType: order.courierType,
                flyerId: order.flyerId,
                status: order.status,
                invoicePayment: order.invoicePayment,
                last_tracking_update: order.last_tracking_update,
                isDelivered: order.isDelivered,
                isReturned: order.isReturned,
                delivered_at: order.delivered_at,
                returned_at: order.returned_at,
                productInfo: order.productInfo || {
                    OrderNumber: order.trackingNumber,
                    date: new Date().toISOString(),
                    CustomerName: "Not Available",
                    Address: "Not Available",
                    OrderDetails: {
                        ProductName: "Not Available",
                        Quantity: "Not Available"
                    }
                },
                trackingResponse: {
                    status: latestStatus,
                    status_record: trackingHistory
                },
                lastUpdated: order.last_tracking_update || null,
                createdAt: order.createdAt,
                verification_date: order.verification_date || null,
                verified: order.verified || false
            };
        });

        const totalPages = Math.ceil(totalOrders / limit);

        return {
            trackingData,
            pagination: {
                totalOrders,
                totalPages,
                limit,
                currentPage: page,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    } catch (error) {
        console.error('Error in returnedOrder:', error);
        return {
            trackingData: [],
            pagination: {
                totalOrders: 0,
                totalPages: 0,
                limit,
                currentPage: page,
                hasNextPage: false,
                hasPrevPage: false,
            },
        };
    }
};


// ===================================== verify return ===============================================
export const verifyReturn = async (req, res) => {
    try {
        const { trackingNumber, flyerId } = req.body;


        // Validate input
        if (!trackingNumber || !flyerId) {
            return res.json({
                success: false,
                message: 'Tracking number and flyer ID are required'
            });
        }

        // Check if order exists
        const order = await Order.findOne({ trackingNumber, flyerId });
        if (!order) {
            return res.json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order is already returned
        if (order.isReturned) {
            return res.json({
                success: false,
                message: 'This order has already been marked as returned'
            });
        }

        // Update order status
        const updatedOrder = await Order.findByIdAndUpdate(
            order._id,
            {
                isReturned: true,
                returned_at: new Date(),
            },
            { new: true }
        );

        return res.json({
            success: true,
            message: 'Return verified successfully',
            order: updatedOrder
        });

    } catch (error) {
        console.error('Error verifying return:', error);
        return res.status(500).json({
            success: false,
            message: 'Error verifying return. Please try again later.'
        });
    }
};

// ===================================== remarks order ===============================================

export const remarksOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { content } = req.body;
        const userId = req.user?._id;

        if (!orderId || !content) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and remark content are required'
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not authenticated'
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.remarks = {
            content,
            createdBy: userId,
            createdAt: new Date()
        };

        await order.save();

        return res.json({
            success: true,
            message: 'Remark added successfully',
            order
        });

    } catch (error) {
        console.error('Error adding remarks:', error);
        return res.status(500).json({
            success: false,
            message: 'Error adding remarks. Please try again later.'
        });
    }
};
















