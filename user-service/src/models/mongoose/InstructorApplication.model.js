const mongoose = require('mongoose');

const instructorApplicationSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    data: {
        fullName: String,
        headline: String,
        experience: String,
        expertise: [String],
        idCardUrl: String,
        cvUrl: String,
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
    },
    reviewerId: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: 'instructor_applications',
});

module.exports = mongoose.model('InstructorApplication', instructorApplicationSchema);
