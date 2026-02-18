const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true }, // UUID from Auth
    fullName: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    phone: { type: String, default: '' },
    bio: { type: String, default: '' },
}, {
    timestamps: true,
    collection: 'user_profiles',
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
