import mongoose from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';

// Define user schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true }
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);
export default User;
