const svc = require('../services/course.service');

// ============ COURSE ============
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

// ============ SECTION ============
const createSection = async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await svc.createSection(req.params.courseId, req.user.id, req.body) }); } catch (e) { next(e); }
};
const getSections = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getSections(req.params.courseId) }); } catch (e) { next(e); }
};
const updateSection = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.updateSection(req.params.sectionId, req.user.id, req.body) }); } catch (e) { next(e); }
};
const deleteSection = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.deleteSection(req.params.sectionId, req.user.id) }); } catch (e) { next(e); }
};

// ============ LESSON ============
const createLesson = async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await svc.createLesson(req.params.courseId, req.params.sectionId, req.user.id, req.body) }); } catch (e) { next(e); }
};
const getLessons = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getLessons(req.params.sectionId) }); } catch (e) { next(e); }
};
const updateLesson = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.updateLesson(req.params.lessonId, req.user.id, req.body) }); } catch (e) { next(e); }
};
const deleteLesson = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.deleteLesson(req.params.lessonId, req.user.id) }); } catch (e) { next(e); }
};

// ============ RESOURCES ============
const addResource = async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await svc.addResource(req.params.lessonId, req.user.id, req.body) }); } catch (e) { next(e); }
};
const getResources = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getResources(req.params.lessonId) }); } catch (e) { next(e); }
};
const deleteResource = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.deleteResource(req.params.resourceId, req.user.id) }); } catch (e) { next(e); }
};

// ============ COUPON ============
const createCoupon = async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await svc.createCoupon(req.params.courseId, req.user.id, req.body) }); } catch (e) { next(e); }
};
const getCoupons = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getCoupons(req.params.courseId) }); } catch (e) { next(e); }
};
const deleteCoupon = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.deleteCoupon(req.params.couponId, req.user.id) }); } catch (e) { next(e); }
};

module.exports = {
    createCourse, getCourse, getInstructorCourses, getPublishedCourses,
    updateCourse, deleteCourse, submitCourse, previewCourse,
    createSection, getSections, updateSection, deleteSection,
    createLesson, getLessons, updateLesson, deleteLesson,
    addResource, getResources, deleteResource,
    createCoupon, getCoupons, deleteCoupon,
};
