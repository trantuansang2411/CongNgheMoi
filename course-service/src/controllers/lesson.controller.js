const svc = require('../services/course.service');

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
const addResource = async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await svc.addResource(req.params.lessonId, req.user.id, req.body) }); } catch (e) { next(e); }
};
const getResources = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getResources(req.params.lessonId) }); } catch (e) { next(e); }
};
const deleteResource = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.deleteResource(req.params.resourceId, req.user.id) }); } catch (e) { next(e); }
};

module.exports = { createLesson, getLessons, updateLesson, deleteLesson, addResource, getResources, deleteResource };
