import User from '../../models/user.js'

export const updateSystemSettings = async (req, res) => {
    try {
        const { systemName, timezone, language } = req.body;

        res.json({
            success: true,
            message: 'System settings updated successfully',
            settings: {
                systemName,
                timezone,
                language
            }
        });
    } catch (error) {
        console.error('Error updating system settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update system settings'
        });
    }
};

export const getUserSettings = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
};

export const addUser = async (req, res) => {
    try {
        const { username, email, role, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Create new user
        const newUser = new User({
            username,
            email,
            role: role || 'user'
        });

        // Register the user with passport-local-mongoose
        await User.register(newUser, password);

        res.json({
            success: true,
            message: 'User created successfully'
        });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add user'
        });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user fields
        user.username = username;
        user.email = email;
        user.role = role;

        await user.save();

        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent deleting the last admin
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete the last admin user'
                });
            }
        }

        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
};

export const getSystemStatus = async (req, res) => {
    try {
        const { Order } = await import('../../models/order.js');

        // Get order statistics
        const totalOrders = await Order.countDocuments();
        const deliveredOrders = await Order.countDocuments({ isDelivered: true });
        const returnedOrders = await Order.countDocuments({ isReturned: true });
        const pendingOrders = totalOrders - deliveredOrders - returnedOrders;

        // Get system uptime
        const uptime = process.uptime();
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);

        // Get memory usage
        const memoryUsage = process.memoryUsage();
        const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

        res.json({
            success: true,
            data: {
                orders: {
                    total: totalOrders,
                    delivered: deliveredOrders,
                    returned: returnedOrders,
                    pending: pendingOrders
                },
                system: {
                    uptime: `${uptimeHours}h ${uptimeMinutes}m`,
                    memoryUsage: `${memoryUsageMB}MB`,
                    status: 'Operational',
                    lastUpdate: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        console.error('Error getting system status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get system status'
        });
    }
}; 