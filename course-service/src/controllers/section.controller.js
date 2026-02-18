const svc = require('../services/course.service');

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

module.exports = { createSection, getSections, updateSection, deleteSection };
