const Enrollment = require('../models/mongoose/Enrollment.model');
const LessonProgress = require('../models/mongoose/LessonProgress.model');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { NotFoundError, BadRequestError } = require('../../shared/utils/errors');

async function getMyCourses(studentId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        Enrollment.find({ studentId }).skip(skip).limit(limit).sort({ enrolledAt: -1 }).lean(),
        Enrollment.countDocuments({ studentId }),
    ]);
    return { items, total, page, limit };
}

async function getEnrollment(studentId, courseId) {
    const enrollment = await Enrollment.findOne({ studentId, courseId }).lean();
    if (!enrollment) throw new NotFoundError('Enrollment not found');
    return enrollment;
}

async function getLessonProgress(studentId, courseId) {
    return LessonProgress.find({ studentId, courseId }).lean();
}

async function markLessonComplete(studentId, courseId, lessonId, totalLessons) {
    const enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment) throw new NotFoundError('Not enrolled in this course');

    await LessonProgress.findOneAndUpdate(
        { studentId, courseId, lessonId },
        { completed: true, completedAt: new Date() },
        { upsert: true, new: true }
    );

    // Recalculate progress
    const completedCount = await LessonProgress.countDocuments({ studentId, courseId, completed: true });
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    enrollment.progressPercent = progressPercent;
    if (progressPercent >= 100 && enrollment.status !== 'COMPLETED') {
        enrollment.status = 'COMPLETED';
        enrollment.completedAt = new Date();
        await enrollment.save();

        // Publish course.completed event
        await publishEvent('course.completed', {
            studentId, courseId, enrollmentId: enrollment._id.toString(),
        });
        logger.info(`Course completed: student=${studentId}, course=${courseId}`);
    } else {
        await enrollment.save();
    }

    return { progressPercent, completed: progressPercent >= 100 };
}

// Event handler: order.paid → create enrollment
async function handleOrderPaid(data) {
    const { studentId, items } = data;
    for (const item of items) {
        const existing = await Enrollment.findOne({ studentId, courseId: item.courseId });
        if (existing) { logger.warn(`Already enrolled: student=${studentId}, course=${item.courseId}`); continue; }
        await Enrollment.create({
            studentId, courseId: item.courseId, instructorId: item.instructorId, titleSnapshot: item.titleSnapshot,
        });
        await publishEvent('course.enrolled', { studentId, courseId: item.courseId, title: item.titleSnapshot });
        logger.info(`Student ${studentId} enrolled in course ${item.courseId}`);
    }
}

module.exports = { getMyCourses, getEnrollment, getLessonProgress, markLessonComplete, handleOrderPaid };
