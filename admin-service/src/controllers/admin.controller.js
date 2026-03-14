const svc = require('../services/admin.service');

const publishCourse = async (req, res, next) => { try { res.json({ success: true, data: await svc.publishCourse(req.params.courseId) }); } catch (e) { next(e); } };
const markCourseNeedsFixes = async (req, res, next) => { try { res.json({ success: true, data: await svc.markCourseNeedsFixes(req.params.courseId) }); } catch (e) { next(e); } };
const listSubmittedCourses = async (req, res, next) => { try { res.json({ success: true, data: await svc.listSubmittedCourses(parseInt(req.query.page) || 1, parseInt(req.query.limit) || 20) }); } catch (e) { next(e); } };
const getCourseReviewDetail = async (req, res, next) => { try { res.json({ success: true, data: await svc.getCourseReviewDetail(req.params.courseId) }); } catch (e) { next(e); } };
const approveInstructor = async (req, res, next) => { try { res.json({ success: true, data: await svc.approveInstructor(req.params.userId, req.user.id) }); } catch (e) { next(e); } };
const rejectInstructor = async (req, res, next) => { try { res.json({ success: true, data: await svc.rejectInstructor(req.params.userId, req.user.id) }); } catch (e) { next(e); } };
const banInstructor = async (req, res, next) => { try { res.json({ success: true, data: await svc.banInstructor(req.params.userId) }); } catch (e) { next(e); } };
const unbanInstructor = async (req, res, next) => { try { res.json({ success: true, data: await svc.unbanInstructor(req.params.userId) }); } catch (e) { next(e); } };

const listApplications = async (req, res, next) => { try { res.json({ success: true, data: await svc.listApplications(req.query.status, parseInt(req.query.page) || 1, parseInt(req.query.limit) || 20) }); } catch (e) { next(e); } };

module.exports = {
    publishCourse,
    markCourseNeedsFixes,
    listSubmittedCourses,
    getCourseReviewDetail,
    listApplications,
    approveInstructor,
    rejectInstructor,
    banInstructor,
    unbanInstructor,
};

