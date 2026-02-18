const svc = require('../services/learning.service');

const getMyCourses = async (req, res, next) => { try { res.json({ success: true, data: await svc.getMyCourses(req.user.id, +req.query.page || 1, +req.query.limit || 20) }); } catch (e) { next(e); } };
const getEnrollment = async (req, res, next) => { try { res.json({ success: true, data: await svc.getEnrollment(req.user.id, req.params.courseId) }); } catch (e) { next(e); } };
const getLessonProgress = async (req, res, next) => { try { res.json({ success: true, data: await svc.getLessonProgress(req.user.id, req.params.courseId) }); } catch (e) { next(e); } };
const markLessonComplete = async (req, res, next) => { try { res.json({ success: true, data: await svc.markLessonComplete(req.user.id, req.params.courseId, req.body.lessonId, req.body.totalLessons || 0) }); } catch (e) { next(e); } };

module.exports = { getMyCourses, getEnrollment, getLessonProgress, markLessonComplete };
