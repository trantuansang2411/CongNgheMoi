const mongoose = require('mongoose');

// Local cache — populated via instructor.approved / instructor.profile.updated events
const instructorProfileSchema = new mongoose.Schema({
    instructorId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, default: '' }
}, {
    timestamps: true,
    collection: 'instructor_profiles',
});

module.exports = mongoose.model('InstructorProfile', instructorProfileSchema);
