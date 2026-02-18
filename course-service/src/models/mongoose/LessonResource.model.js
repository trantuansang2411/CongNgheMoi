const mongoose = require('mongoose');

const lessonResourceSchema = new mongoose.Schema({
    lessonId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, enum: ['FILE', 'LINK'], required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    sizeBytes: { type: Number, default: 0 },
    mimeType: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: 'lesson_resources',
});

module.exports = mongoose.model('LessonResource', lessonResourceSchema);
