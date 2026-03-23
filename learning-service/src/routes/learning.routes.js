const { Router } = require('express');
const ctrl = require('../controllers/learning.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');

const router = Router();

// ── Enrollment queries ──────────────────────────────────────────────────────
router.get('/enrollments',           authenticate, ctrl.getMyCourses);
router.get('/enrollments/:courseId', authenticate, ctrl.getEnrollment);
router.get('/my-courses',            authenticate, ctrl.getMyCourses);
router.get('/:courseId/player-detail', authenticate, ctrl.getPlayerCourseDetail);

// ── Progress tracking ───────────────────────────────────────────────────────
router.get( '/:courseId/progress',      authenticate, ctrl.getLessonProgress);

// Mark a specific lesson as complete (lesson-level progress)
router.post('/:courseId/complete',      authenticate, ctrl.markLessonComplete);

// Heartbeat: record actual watch-time (~30s interval from client)
// Body: { lessonId: string, deltaWatchSec: number }
router.post('/:courseId/watch-session', authenticate, ctrl.recordWatchSession);

module.exports = router;
