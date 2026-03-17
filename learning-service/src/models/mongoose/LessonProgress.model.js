const mongoose = require('mongoose');

const lessonProgressSchema = new mongoose.Schema({
    studentId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    lessonId: { type: String, required: true, index: true },
    completed: { type: Boolean, default: false },
    watchTimeSec: { type: Number, default: 0 },    // cumulative seconds actually watched
    lastHeartbeatAt: { type: Date },               // timestamp of last valid heartbeat (anti-cheat)
    completedAt: { type: Date },
}, { timestamps: true });

lessonProgressSchema.index({ studentId: 1, courseId: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ studentId: 1, courseId: 1 });

module.exports = mongoose.model('LessonProgress', lessonProgressSchema);
