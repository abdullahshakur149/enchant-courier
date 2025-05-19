import User from '../../models/user.js';
import { createLog } from '../../utils/logger.js';
import { Notification } from '../../models/notification.js';

export const CreateUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Check if all required fields are provided
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Username, password, and role are required' });
        }
        // Check if the user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create a new user instance
        const user = new User({ username, role });

        // Use passport-local-mongoose to register the user (handles password hashing)
        await User.register(user, password);

        // Create notification for new user
        await Notification.create({
            type: 'status_change',
            title: 'New User Created',
            message: `New ${role} user "${username}" has been created`,
            user: req.user._id
        });

        // Create log for user creation
        await createLog({
            action: 'create',
            entity: 'user',
            entityId: user._id,
            details: {
                username: user.username,
                role: user.role,
                createdAt: user.createdAt
            },
            performedBy: req.user._id,
            req
        });

        // Send a success response
        res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
        // Catch any errors during user creation
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user', error });
    }
};

export const getAllEmployees = async (req, res) => {
    try {
        const employees = await User.find();

        // Create log for viewing employees
        await createLog({
            action: 'status_change',
            entity: 'user',
            entityId: req.user._id,
            details: {
                totalEmployees: employees.length,
                roles: employees.map(emp => emp.role)
            },
            performedBy: req.user._id,
            req
        });

        res.status(200).json({ employees });
    } catch (error) {
        // Catch any errors during fetching users
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users', error });
    }
}

export const deleteEmployeeController = async (req, res) => {
    const { id } = req.params;

    try {
        // Get employee details before deletion for logging
        const employeeToDelete = await User.findById(id);

        if (!employeeToDelete) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Create notification before deletion
        await Notification.create({
            type: 'status_change',
            title: 'User Deleted',
            message: `User "${employeeToDelete.username}" has been deleted`,
            user: req.user._id
        });

        // Create log before deletion
        await createLog({
            action: 'delete',
            entity: 'user',
            entityId: id,
            details: {
                username: employeeToDelete.username,
                role: employeeToDelete.role,
                lastLogin: employeeToDelete.lastLogin,
                createdAt: employeeToDelete.createdAt
            },
            performedBy: req.user._id,
            req
        });

        // Delete the employee
        await User.findByIdAndDelete(id);

        res.status(200).json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ message: 'Error deleting employee' });
    }
};