const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    studentId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    instructorId: { type: String },
    titleSnapshot: { type: String },
    status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },
    progressPercent: { type: Number, default: 0 },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
}, { timestamps: true });

enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
