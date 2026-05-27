const mongoose = require('mongoose');

// Snapshot of course structure received from course.published event.
// Allows learning-service to compute progress WITHOUT calling course-service via gRPC.
const courseSnapshotSchema = new mongoose.Schema({
    courseId: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: '' },
    slug: { type: String, default: '' },
    instructorId: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    totalLessons: { type: Number, default: 0 },
    totalDurationSec: { type: Number, default: 0 },

    // Denormalized section list
    sections: [{
        _id: false,
        sectionId: { type: String, required: true },
        title: { type: String, default: '' },
        orderIndex: { type: Number, default: 0 },
    }],

    // Denormalized lesson list (only metadata needed for progress)
    lessons: [{
        _id: false,
        lessonId: { type: String, required: true },
        sectionId: { type: String, default: '' },
        title: { type: String, default: '' },
        orderIndex: { type: Number, default: 0 },
        durationSec: { type: Number, default: 0 },
        isPreview: { type: Boolean, default: false },
        videoUrl: { type: String, default: '' },
    }],

    publishedAt: { type: Date },
}, {
    timestamps: true, // createdAt = first snapshot, updatedAt = last re-publish
    collection: 'course_snapshots',
});

module.exports = mongoose.model('CourseSnapshot', courseSnapshotSchema);
