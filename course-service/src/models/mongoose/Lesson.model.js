const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const lessonSchema = new mongoose.Schema({
    courseId: { type: String, required: true, index: true },
    sectionId: { type: String, required: true, index: true },
    lessonId: { type: String, default: () => require('uuid').v4(), unique: true, index: true },
    title: { type: String, required: true },
    orderIndex: { type: Number, default: 0 },
    videoUrl: { type: String, default: '' },
    durationSec: { type: Number, default: 0 },
    isPreview: { type: Boolean, default: false },
}, {
    timestamps: true,
    collection: 'lessons',
});

module.exports = mongoose.model('Lesson', lessonSchema);
