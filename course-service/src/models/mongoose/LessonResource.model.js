const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const lessonResourceSchema = new mongoose.Schema({
    lessonId: { type: String, required: true, index: true },
    resourceId: { type: String, default: () => require('uuid').v4(), unique: true, index: true },
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
