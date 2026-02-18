const svc = require('../services/admin.service');

const publishCourse = async (req, res, next) => { try { res.json({ success: true, data: await svc.publishCourse(req.params.courseId) }); } catch (e) { next(e); } };
const hideCourse = async (req, res, next) => { try { res.json({ success: true, data: await svc.hideCourse(req.params.courseId) }); } catch (e) { next(e); } };
const getCourseInfo = async (req, res, next) => { try { res.json({ success: true, data: await svc.getCourseInfo(req.params.courseId) }); } catch (e) { next(e); } };
const approveInstructor = async (req, res, next) => { try { res.json({ success: true, data: await svc.approveInstructor(req.params.userId) }); } catch (e) { next(e); } };
const rejectInstructor = async (req, res, next) => { try { res.json({ success: true, data: await svc.rejectInstructor(req.params.userId) }); } catch (e) { next(e); } };
const banInstructor = async (req, res, next) => { try { res.json({ success: true, data: await svc.banInstructor(req.params.userId) }); } catch (e) { next(e); } };
const unbanInstructor = async (req, res, next) => { try { res.json({ success: true, data: await svc.unbanInstructor(req.params.userId) }); } catch (e) { next(e); } };

module.exports = { publishCourse, hideCourse, getCourseInfo, approveInstructor, rejectInstructor, banInstructor, unbanInstructor };

