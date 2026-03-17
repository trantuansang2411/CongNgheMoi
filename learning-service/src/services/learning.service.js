'use strict';

const Enrollment    = require('../models/mongoose/Enrollment.model');
const LessonProgress = require('../models/mongoose/LessonProgress.model');
const CourseSnapshot = require('../models/mongoose/CourseSnapshot.model');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { NotFoundError, BadRequestError } = require('../../shared/utils/errors');

// ─── Constants ──────────────────────────────────────────────────────────────
const MAX_HEARTBEAT_SEC          = 35;   // max delta per heartbeat call (client sends ~30s)
const MIN_HEARTBEAT_INTERVAL_SEC = 20;   // minimum seconds between heartbeats (production anti-spam)
const LESSON_COMPLETE_PCT        = 90;   // % of lessons completed required
const WATCH_TIME_PCT             = 0.70; // 70% of total course duration required
const IS_DEV = (process.env.NODE_ENV || 'dev') === 'dev'; // skip cooldown in dev for Postman testing

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Danh sách khoá học đã ghi danh của học viên (phân trang).
 */
async function getMyCourses(studentId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        Enrollment.find({ studentId }).skip(skip).limit(limit).sort({ enrolledAt: -1 }).lean(),
        Enrollment.countDocuments({ studentId }),
    ]);
    return { items, total, page, limit };
}

/**
 * Chi tiết ghi danh của học viên với một khoá học.
 */
async function getEnrollment(studentId, courseId) {
    const enrollment = await Enrollment.findOne({ studentId, courseId }).lean();
    if (!enrollment) throw new NotFoundError('Enrollment not found');
    return enrollment;
}

/**
 * Tiến độ từng bài học của học viên trong một khoá học.
 */
async function getLessonProgress(studentId, courseId) {
    return LessonProgress.find({ studentId, courseId }).lean();
}

// ─── Mark Lesson Complete ────────────────────────────────────────────────────

/**
 * Đánh dấu một bài học là đã hoàn thành.
 * Sử dụng CourseSnapshot thay vì gọi gRPC đến course-service.
 */
async function markLessonComplete(studentId, courseId, lessonId) {
    if (!lessonId) throw new BadRequestError('lessonId is required');

    // 1. Kiểm tra ghi danh
    const enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment) throw new NotFoundError('Not enrolled in this course');

    // 2. Lấy snapshot — không cần gRPC nữa
    const snapshot = await CourseSnapshot.findOne({ courseId }).lean();
    if (!snapshot) throw new NotFoundError('Course structure not found (snapshot missing)');

    const totalLessons = snapshot.totalLessons || 0;
    if (totalLessons <= 0) throw new BadRequestError('Course has no lessons');

    // 3. Đánh dấu bài học hoàn thành (upsert, idempotent)
    await LessonProgress.findOneAndUpdate(
        { studentId, courseId, lessonId },
        { $set: { completed: true, completedAt: new Date() } },
        { upsert: true, new: true }
    );

    // 4. Tính lại % tiến độ
    const completedCount = await LessonProgress.countDocuments({ studentId, courseId, completed: true });
    const progressPercent = Math.round((completedCount / totalLessons) * 100);

    // 5. Lưu % tiến độ vào Enrollment
    enrollment.progressPercent = progressPercent;
    await enrollment.save();

    // 6. Kiểm tra hoàn thành khoá học (fire-and-forget, không block response)
    _checkCourseCompletion(studentId, courseId, enrollment, snapshot).catch(err =>
        logger.error(`_checkCourseCompletion error: student=${studentId}, course=${courseId}`, err.message)
    );

    return { progressPercent, completed: enrollment.status === 'COMPLETED' };
}

// ─── Watch Time Heartbeat ────────────────────────────────────────────────────

/**
 * Ghi nhận thời gian xem thực tế của một bài học (heartbeat mỗi ~30 giây từ client).
 *
 * Anti-cheat:
 *  - deltaWatchSec bị cap tối đa MAX_HEARTBEAT_SEC (35s) để ngăn fake batch lớn.
 *  - Dùng MongoDB $inc (atomic) — không có race condition dù nhiều học viên cùng lúc.
 *  - Không trust timestamp từ client.
 *
 * @param {string} studentId
 * @param {string} courseId
 * @param {string} lessonId
 * @param {number} deltaWatchSec - số giây đã xem thực tế kể từ heartbeat trước
 */
async function recordWatchSession(studentId, courseId, lessonId, deltaWatchSec) {
    if (!lessonId) throw new BadRequestError('lessonId is required');
    if (typeof deltaWatchSec !== 'number' || deltaWatchSec <= 0) {
        throw new BadRequestError('deltaWatchSec must be a positive number');
    }

    // Kiểm tra ghi danh
    const enrollment = await Enrollment.findOne({ studentId, courseId }).lean();
    if (!enrollment) throw new NotFoundError('Not enrolled in this course');

    // ── Cooldown check (bỏ qua khi NODE_ENV=dev để dễ test Postman) ──────────
    if (!IS_DEV) {
        const existing = await LessonProgress.findOne(
            { studentId, courseId, lessonId },
            { lastHeartbeatAt: 1 }  // projection: chỉ lấy field cần thiết
        ).lean();
        if (existing?.lastHeartbeatAt) {
            const elapsedSec = (Date.now() - new Date(existing.lastHeartbeatAt).getTime()) / 1000;
            if (elapsedSec < MIN_HEARTBEAT_INTERVAL_SEC) {
                const waitSec = Math.ceil(MIN_HEARTBEAT_INTERVAL_SEC - elapsedSec);
                throw new BadRequestError(`Heartbeat too frequent. Please wait ${waitSec}s`);
            }
        }
    }

    // Server-side cap chống gian lận
    const safeDelta = Math.min(Math.floor(deltaWatchSec), MAX_HEARTBEAT_SEC);

    // Atomic update: cộng dồn watchTimeSec, ghi lại thời điểm heartbeat
    await LessonProgress.findOneAndUpdate(
        { studentId, courseId, lessonId },
        {
            $inc: { watchTimeSec: safeDelta },
            $set: { lastHeartbeatAt: new Date() },
        },
        { upsert: true, new: true }
    );

    // Kiểm tra hoàn thành khoá học (fire-and-forget)
    const snapshot = await CourseSnapshot.findOne({ courseId }).lean();
    if (snapshot) {
        _checkCourseCompletion(studentId, courseId, null, snapshot).catch(err =>
            logger.error(`_checkCourseCompletion error: student=${studentId}, course=${courseId}`, err.message)
        );
    }

    return { recorded: safeDelta };
}

// ─── Course Completion Check (private) ───────────────────────────────────────

/**
 * Kiểm tra và đánh dấu hoàn thành khoá học nếu đủ điều kiện.
 *
 * Công thức chống gian lận:
 *  lessonProgress >= 90%  VÀ  totalWatchTime >= 70% totalDurationSec
 *
 * Thiết kế:
 *  - Chạy fire-and-forget: không block response API
 *  - Guard `status === 'COMPLETED'` + findOneAndUpdate condition: idempotent, tránh publish event 2 lần
 *  - Dùng aggregation $sum để tính tổng watchTimeSec hiệu quả, tránh load toàn bộ docs vào memory
 *
 * @param {string} studentId
 * @param {string} courseId
 * @param {object|null} enrollment - nếu null sẽ tự query
 * @param {object} snapshot - CourseSnapshot (đã có sẵn từ caller)
 */
async function _checkCourseCompletion(studentId, courseId, enrollment, snapshot) {
    // Tránh re-check nếu đã hoàn thành
    const enroll = enrollment || await Enrollment.findOne({ studentId, courseId });
    if (!enroll || enroll.status === 'COMPLETED') return;

    const totalLessons     = snapshot.totalLessons || 0;
    const totalDurationSec = snapshot.totalDurationSec || 0;

    if (totalLessons === 0) return; // khoá học không có bài → bỏ qua

    // Đếm số bài đã hoàn thành
    const completedCount = await LessonProgress.countDocuments({ studentId, courseId, completed: true });
    const progressPercent = Math.round((completedCount / totalLessons) * 100);

    if (progressPercent < LESSON_COMPLETE_PCT) return; // chưa đủ % bài hoàn thành

    // Tính tổng thời gian xem bằng aggregation (hiệu quả, scalable)
    const [agg] = await LessonProgress.aggregate([
        { $match: { studentId, courseId } },
        { $group: { _id: null, totalWatch: { $sum: '$watchTimeSec' } } },
    ]);
    const totalWatchSec = agg ? agg.totalWatch : 0;
    const requiredWatchSec = totalDurationSec * WATCH_TIME_PCT;

    if (totalWatchSec < requiredWatchSec) {
        logger.info(
            `Course not yet completed (watch-time): student=${studentId}, course=${courseId}, ` +
            `watched=${totalWatchSec}s / required=${requiredWatchSec}s`
        );
        return;
    }

    // Atomic update: chỉ update nếu status vẫn là ACTIVE → tránh race condition
    const updated = await Enrollment.findOneAndUpdate(
        { studentId, courseId, status: 'ACTIVE' }, // guard
        { status: 'COMPLETED', completedAt: new Date(), progressPercent },
        { new: true }
    );

    if (!updated) return; // đã được xử lý bởi concurrent request khác

    await publishEvent('course.completed', {
        studentId,
        courseId,
        enrollmentId: updated._id.toString(),
        completedAt:  updated.completedAt,
    });

    logger.info(
        `Course COMPLETED: student=${studentId}, course=${courseId}, ` +
        `progress=${progressPercent}%, watched=${totalWatchSec}s`
    );
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

/**
 * Handler cho event order.paid → tạo Enrollment cho học viên.
 */
async function handleOrderPaid(data) {
    const { studentId, items } = data;
    for (const item of items) {
        const existing = await Enrollment.findOne({ studentId, courseId: item.courseId });
        if (existing) {
            logger.warn(`Already enrolled: student=${studentId}, course=${item.courseId}`);
            continue;
        }
        await Enrollment.create({
            studentId,
            courseId: item.courseId,
            instructorId: item.instructorId,
            titleSnapshot: item.titleSnapshot,
        });
        await publishEvent('course.enrolled', { studentId, courseId: item.courseId, title: item.titleSnapshot });
        logger.info(`Student ${studentId} enrolled in course ${item.courseId}`);
    }
}

/**
 * Handler cho event course.published → upsert CourseSnapshot.
 * Đây là điểm cốt lõi để learning-service không phụ thuộc gRPC.
 */
async function handleCoursePublished(data) {
    const {
        courseId, title, slug, instructorId,
        totalLessons, totalDurationSec, publishedAt,
        sections = [], lessons = [],
    } = data;

    await CourseSnapshot.findOneAndUpdate(
        { courseId },
        {
            courseId, title, slug, instructorId,
            totalLessons:     totalLessons || 0,
            totalDurationSec: totalDurationSec || 0,
            publishedAt:      publishedAt ? new Date(publishedAt) : new Date(),
            sections: sections.map(s => ({
                sectionId:  s.sectionId,
                title:      s.title,
                orderIndex: s.orderIndex || 0,
            })),
            lessons: lessons.map(l => ({
                lessonId:   l.lessonId,
                sectionId:  l.sectionId || '',
                title:      l.title,
                orderIndex: l.orderIndex || 0,
                durationSec: l.durationSec || 0,
            })),
        },
        { upsert: true, new: true }
    );

    logger.info(`CourseSnapshot upserted: courseId=${courseId}, lessons=${lessons.length}`);
}

module.exports = {
    getMyCourses,
    getEnrollment,
    getLessonProgress,
    markLessonComplete,
    recordWatchSession,
    handleOrderPaid,
    handleCoursePublished,
};
