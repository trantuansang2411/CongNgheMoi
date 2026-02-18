const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    courseId: { type: String, required: true, index: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
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
