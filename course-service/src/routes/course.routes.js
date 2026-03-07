const { Router } = require('express');
const ctrl = require('../controllers/course.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth.middleware');
const router = Router();

// ============ COURSE (Public) ============
router.get('/published', ctrl.getPublishedCourses);
router.get('/:courseId', ctrl.getCourse);

// ============ COURSE (Instructor) ============
router.post('/', authenticate, authorize('INSTRUCTOR'), ctrl.createCourse);
router.get('/instructor/mine', authenticate, authorize('INSTRUCTOR'), ctrl.getInstructorCourses);
router.put('/:courseId', authenticate, authorize('INSTRUCTOR'), ctrl.updateCourse);
router.delete('/:courseId', authenticate, authorize('INSTRUCTOR'), ctrl.deleteCourse);
router.post('/:courseId/submit', authenticate, authorize('INSTRUCTOR'), ctrl.submitCourse);
router.get('/:courseId/preview', authenticate, authorize('INSTRUCTOR'), ctrl.previewCourse);

// ============ SECTION ============
router.post('/:courseId/sections', authenticate, authorize('INSTRUCTOR'), ctrl.createSection);
router.get('/:courseId/sections', ctrl.getSections);
router.put('/:courseId/sections/:sectionId', authenticate, authorize('INSTRUCTOR'), ctrl.updateSection);
router.delete('/:courseId/sections/:sectionId', authenticate, authorize('INSTRUCTOR'), ctrl.deleteSection);
router.put('/:courseId/sections/reorder', authenticate, authorize('INSTRUCTOR'), ctrl.reorderSections);

// ============ LESSON ============
router.post('/:courseId/sections/:sectionId/lessons', authenticate, authorize('INSTRUCTOR'), ctrl.createLesson);
router.get('/:courseId/sections/:sectionId/lessons', ctrl.getLessons);
router.put('/:courseId/sections/:sectionId/lessons/:lessonId', authenticate, authorize('INSTRUCTOR'), ctrl.updateLesson);
router.delete('/:courseId/sections/:sectionId/lessons/:lessonId', authenticate, authorize('INSTRUCTOR'), ctrl.deleteLesson);
router.put('/:courseId/sections/:sectionId/lessons/reorder', authenticate, authorize('INSTRUCTOR'), ctrl.reorderLessons);

// ============ RESOURCES ============
router.post('/:courseId/sections/:sectionId/lessons/:lessonId/resources', authenticate, authorize('INSTRUCTOR'), ctrl.addResource);
router.get('/:courseId/sections/:sectionId/lessons/:lessonId/resources', ctrl.getResources);
router.delete('/:courseId/sections/:sectionId/lessons/:lessonId/resources/:resourceId', authenticate, authorize('INSTRUCTOR'), ctrl.deleteResource);

// ============ COUPON ============
router.post('/:courseId/coupons', authenticate, authorize('INSTRUCTOR'), ctrl.createCoupon);
router.get('/:courseId/coupons', authenticate, authorize('INSTRUCTOR'), ctrl.getCoupons);
router.delete('/:courseId/coupons/:couponId', authenticate, authorize('INSTRUCTOR'), ctrl.deleteCoupon);

module.exports = router;
