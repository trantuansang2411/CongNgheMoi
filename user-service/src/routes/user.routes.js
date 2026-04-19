const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth.middleware');
const { uploadUserAvatar, uploadInstructorAvatar, uploadInstructorApplicationPhoto } = require('../middleware/upload');

const router = Router();

router.get('/me', authenticate, userController.getProfile);
router.put('/me', authenticate, userController.updateProfile);
router.post('/me/avatar', authenticate, uploadUserAvatar.single('avatar'), userController.uploadUserAvatar);
router.post('/instructor/apply', authenticate, uploadInstructorApplicationPhoto.single('profileImage'), userController.applyInstructor);
router.get('/instructor/application', authenticate, userController.getApplication);
router.put('/instructor/me', authenticate, authorize('INSTRUCTOR'), userController.updateInstructorProfile);
router.get('/instructor/me', authenticate, authorize('INSTRUCTOR'), userController.getMyInstructorProfile);
router.post('/instructor/me/avatar', authenticate, authorize('INSTRUCTOR'), uploadInstructorAvatar.single('avatar'), userController.uploadInstructorAvatar);
router.get('/instructor/:userId', userController.getInstructorProfile);

module.exports = router;
