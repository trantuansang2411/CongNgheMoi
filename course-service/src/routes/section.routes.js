const { Router } = require('express');
const ctrl = require('../controllers/section.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth.middleware');
const router = Router({ mergeParams: true });

router.post('/', authenticate, authorize('INSTRUCTOR'), ctrl.createSection);
router.get('/', ctrl.getSections);
router.put('/:sectionId', authenticate, authorize('INSTRUCTOR'), ctrl.updateSection);
router.delete('/:sectionId', authenticate, authorize('INSTRUCTOR'), ctrl.deleteSection);

module.exports = router;
