import mongoose from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';

// Define user schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['user', 'admin', 'manager'], default: 'user' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);
export default User;
