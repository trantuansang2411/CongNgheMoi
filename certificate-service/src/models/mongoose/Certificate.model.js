const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    studentId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    enrollmentId: { type: String, required: true },
    certificateNo: { type: String, unique: true },
    issuedAt: { type: Date, default: Date.now },
    title: { type: String },
    studentName: { type: String },
    instructorName: { type: String },
    verificationUrl: { type: String },
}, { timestamps: true });

certificateSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
