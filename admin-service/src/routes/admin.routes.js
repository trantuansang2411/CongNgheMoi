const { Router } = require('express');
const ctrl = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth.middleware');
const router = Router();

router.use(authenticate, authorize('ADMIN'));
router.get('/applications', ctrl.listApplications);
router.get('/courses/submitted', ctrl.listSubmittedCourses);
router.get('/courses/:courseId/review-detail', ctrl.getCourseReviewDetail);
router.post('/courses/:courseId/publish', ctrl.publishCourse);
router.post('/courses/:courseId/needs-fixes', ctrl.markCourseNeedsFixes);
router.post('/instructors/:userId/approve', ctrl.approveInstructor);
router.post('/instructors/:userId/reject', ctrl.rejectInstructor);
router.post('/instructors/:userId/ban', ctrl.banInstructor);
router.post('/instructors/:userId/unban', ctrl.unbanInstructor);

module.exports = router;

