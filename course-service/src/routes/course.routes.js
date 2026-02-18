const { Router } = require('express');
const ctrl = require('../controllers/course.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth.middleware');
const router = Router();

// Public
router.get('/published', ctrl.getPublishedCourses);
router.get('/:courseId', ctrl.getCourse);

// Instructor
router.post('/', authenticate, authorize('INSTRUCTOR'), ctrl.createCourse);
router.get('/instructor/mine', authenticate, authorize('INSTRUCTOR'), ctrl.getInstructorCourses);
router.put('/:courseId', authenticate, authorize('INSTRUCTOR'), ctrl.updateCourse);
router.delete('/:courseId', authenticate, authorize('INSTRUCTOR'), ctrl.deleteCourse);
router.post('/:courseId/submit', authenticate, authorize('INSTRUCTOR'), ctrl.submitCourse);
router.get('/:courseId/preview', authenticate, authorize('INSTRUCTOR'), ctrl.previewCourse);

module.exports = router;
