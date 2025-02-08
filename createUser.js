// import mongoose from 'mongoose';
// import User from './models/user.js'; // Import your User model
// import connectDB from './utils/database/db.js';

// connectDB(); // Ensure MongoDB is connected

// async function createUser(username, password) {
//     try {
//         const user = new User({ username });

//         // Hash password & generate salt using passport-local-mongoose
//         await User.register(user, password);

//         console.log('User created successfully');
//         mongoose.connection.close(); // Close DB connection after execution
//     } catch (error) {
//         console.error('Error creating user:', error);
//     }
// }

// // Create a user (run once)
// createUser('enchantadmin', 'yoursecurepassword');
