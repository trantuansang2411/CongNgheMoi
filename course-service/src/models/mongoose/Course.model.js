const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const courseSchema = new mongoose.Schema({
    courseId: { type: String, default: () => uuidv4(), unique: true, index: true },
    instructorId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String, default: '' },
    objectives: [{ type: String }], // học xong khóa này bạn sẽ làm được gì. 
    requirements: [{ type: String }], // yêu cầu trước khi học khóa này
    outcomes: [{ type: String }], // kết quả sau khi học khóa này
    topicId: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    basePrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    currency: { type: String, default: 'VND' },
    status: {
        type: String,
        enum: ['DRAFT', 'SUBMITTED', 'PUBLISHED', 'HIDDEN'],
        default: 'DRAFT',
        index: true,
    },
    submittedAt: { type: Date },
    publishedAt: { type: Date },
    totalSections: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },
    totalDurationSec: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: 'courses',
});

courseSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Course', courseSchema);
