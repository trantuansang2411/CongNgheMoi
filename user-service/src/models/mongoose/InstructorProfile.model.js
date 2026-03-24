const mongoose = require('mongoose');

const instructorProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    headline: { type: String, default: '' },
    bio: { type: String, default: '' },
    expertise: { type: String, default: '' },
    experience: { type: String, default: '' },
    portfolioUrl: { type: String, default: '' },
    teachingTopics: { type: [String], default: [] },
    payoutInfo: {
        bankName: String,
        accountNumber: String,
        accountHolder: String,
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'BANNED'],
        default: 'ACTIVE',
    },
}, {
    timestamps: true,
    collection: 'instructor_profiles',
});

module.exports = mongoose.model('InstructorProfile', instructorProfileSchema);
