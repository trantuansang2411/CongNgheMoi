const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    studentId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 2000 },
    status: { type: String, enum: ['ACTIVE', 'HIDDEN'], default: 'ACTIVE' },
}, { timestamps: true });

reviewSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
