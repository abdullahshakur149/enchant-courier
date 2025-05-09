import mongoose from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';

// Define user schema without email
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    role: { type: String, enum: ['employee', 'admin'], default: 'employee' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

// Apply passport-local-mongoose plugin
userSchema.plugin(passportLocalMongoose, {
    usernameField: 'username',  // Define the field used for authentication
    errorMessages: {
        UserExistsError: 'A user with the given username is already registered.'
    }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
