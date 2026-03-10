const { Router } = require('express');
const ctrl = require('../controllers/learning.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const router = Router();
router.get('/enrollments', authenticate, ctrl.getEnrollment);
router.get('/my-courses', authenticate, ctrl.getMyCourses);
router.get('/:courseId/progress', authenticate, ctrl.getLessonProgress);
router.post('/:courseId/complete', authenticate, ctrl.markLessonComplete);
module.exports = router;
