import User from '../../models/user.js';

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
        const employee = await User.findByIdAndDelete(id);

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // After deletion, redirect to the employee list page
        res.status(200).json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ message: 'Error deleting employee' });
    }
};