const { Router } = require('express');
const ctrl = require('../controllers/learning.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const router = Router();
router.get('/enrollments', authenticate, ctrl.getEnrollments);
router.post('/:courseId/progress', authenticate, ctrl.updateProgress);
router.get('/:courseId/progress', authenticate, ctrl.getCourseProgress);
module.exports = router;
