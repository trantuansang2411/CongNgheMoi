const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const sectionSchema = new mongoose.Schema({
    courseId: { type: String, required: true, index: true },
    sectionId: { type: String, default: () => uuidv4(), unique: true, index: true },
    title: { type: String, required: true },
    orderIndex: { type: Number, default: 0 },
}, {
    timestamps: true,
    collection: 'sections',
});

module.exports = mongoose.model('Section', sectionSchema);
