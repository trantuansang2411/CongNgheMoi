const svc = require('../services/course.service');

const createCourse = async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await svc.createCourse(req.user.id, req.body) }); } catch (e) { next(e); }
};
const getCourse = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getCourseDetail(req.params.courseId) }); } catch (e) { next(e); }
};
const getInstructorCourses = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getInstructorCourses(req.user.id, +req.query.page || 1, +req.query.limit || 20) }); } catch (e) { next(e); }
};
const getPublishedCourses = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getPublishedCourses(+req.query.page || 1, +req.query.limit || 20) }); } catch (e) { next(e); }
};
const updateCourse = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.updateCourse(req.params.courseId, req.user.id, req.body) }); } catch (e) { next(e); }
};
const deleteCourse = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.deleteCourse(req.params.courseId, req.user.id) }); } catch (e) { next(e); }
};
const submitCourse = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.submitCourse(req.params.courseId, req.user.id) }); } catch (e) { next(e); }
};
const previewCourse = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.previewCourse(req.params.courseId, req.user.id) }); } catch (e) { next(e); }
};

module.exports = { createCourse, getCourse, getInstructorCourses, getPublishedCourses, updateCourse, deleteCourse, submitCourse, previewCourse };
