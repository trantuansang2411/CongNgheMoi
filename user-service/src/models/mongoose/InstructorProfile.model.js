const mongoose = require('mongoose');

const instructorProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    headline: { type: String, default: '' },
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
