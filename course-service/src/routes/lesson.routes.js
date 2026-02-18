const { Router } = require('express');
const ctrl = require('../controllers/lesson.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth.middleware');
const router = Router({ mergeParams: true });

// Lessons
router.post('/', authenticate, authorize('INSTRUCTOR'), ctrl.createLesson);
router.get('/', ctrl.getLessons);
router.put('/:lessonId', authenticate, authorize('INSTRUCTOR'), ctrl.updateLesson);
router.delete('/:lessonId', authenticate, authorize('INSTRUCTOR'), ctrl.deleteLesson);

// Resources
router.post('/:lessonId/resources', authenticate, authorize('INSTRUCTOR'), ctrl.addResource);
router.get('/:lessonId/resources', ctrl.getResources);
router.delete('/:lessonId/resources/:resourceId', authenticate, authorize('INSTRUCTOR'), ctrl.deleteResource);

module.exports = router;
