const svc = require('../services/learning.service');

const getMyCourses = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getMyCourses(req.user.id, +req.query.page || 1, +req.query.limit || 20) }); }
    catch (e) { next(e); }
};

const getEnrollment = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getEnrollment(req.user.id, req.params.courseId) }); }
    catch (e) { next(e); }
};

const getPlayerCourseDetail = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getPlayerCourseDetail(req.user.id, req.params.courseId) }); }
    catch (e) { next(e); }
};

const getLessonProgress = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getLessonProgress(req.user.id, req.params.courseId) }); }
    catch (e) { next(e); }
};

const markLessonComplete = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.markLessonComplete(req.user.id, req.params.courseId, req.body.lessonId) }); }
    catch (e) { next(e); }
};

/**
 * POST /:courseId/watch-session
 * Body: { lessonId: string, deltaWatchSec: number }
 *
 * Ghi nhận thời gian xem thực tế (heartbeat từ client mỗi ~30s).
 * deltaWatchSec được cap tối đa 35s phía server để chống gian lận.
 */
const recordWatchSession = async (req, res, next) => {
    try {
        const { lessonId, deltaWatchSec } = req.body;
        res.json({
            success: true,
            data: await svc.recordWatchSession(req.user.id, req.params.courseId, lessonId, Number(deltaWatchSec)),
        });
    } catch (e) { next(e); }
};

module.exports = { getMyCourses, getEnrollment, getPlayerCourseDetail, getLessonProgress, markLessonComplete, recordWatchSession };
