const Course = require('../models/mongoose/Course.model');
const slugify = require('slugify');

async function create(data) {
    data.slug = slugify(data.title, { lower: true, strict: true }) + '-' + Date.now();
    return Course.create(data);
}

async function findByCourseId(courseId) {
    return Course.findOne({ courseId, deletedAt: null });
}

async function findByInstructor(instructorId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        Course.find({ instructorId, deletedAt: null }).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Course.countDocuments({ instructorId, deletedAt: null }),
    ]);
    return { items, total, page, limit };
}

async function findPublished(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        Course.find({ status: 'PUBLISHED', deletedAt: null }).sort({ publishedAt: -1 }).skip(skip).limit(limit),
        Course.countDocuments({ status: 'PUBLISHED', deletedAt: null }),
    ]);
    return { items, total, page, limit };
}

async function update(courseId, data) {
    return Course.findOneAndUpdate({ courseId, deletedAt: null }, data, { new: true });
}

async function softDelete(courseId) {
    return Course.findOneAndUpdate({ courseId }, { deletedAt: new Date() }, { new: true });
}

async function updateStatus(courseId, status, extra = {}) {
    return Course.findOneAndUpdate({ courseId }, { status, ...extra }, { new: true });
}

async function updateCourseStats(courseId) {
    const Section = require('../models/mongoose/Section.model');
    const Lesson = require('../models/mongoose/Lesson.model');

    const totalSections = await Section.countDocuments({ courseId });
    const lessons = await Lesson.find({ courseId });
    const totalLessons = lessons.length;
    const totalDurationSec = lessons.reduce((sum, l) => sum + (l.durationSec || 0), 0);

    return Course.findOneAndUpdate(
        { courseId },
        { totalSections, totalLessons, totalDurationSec },
        { new: true }
    );
}

module.exports = {
    create, findByCourseId, findByInstructor, findPublished,
    update, softDelete, updateStatus, updateCourseStats,
};
