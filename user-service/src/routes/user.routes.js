const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');

const router = Router();

router.get('/me', authenticate, userController.getProfile);
router.put('/me', authenticate, userController.updateProfile);
router.post('/instructor/apply', authenticate, userController.applyInstructor);
router.get('/instructor/application', authenticate, userController.getApplication);
router.get('/instructor/:userId', userController.getInstructorProfile);

module.exports = router;
