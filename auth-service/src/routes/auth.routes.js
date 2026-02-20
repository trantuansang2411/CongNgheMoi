const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../../shared/middleware/validate.middleware');
const {
    registerSchema,
    loginSchema,
    googleLoginSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require('../middleware/auth.validator');

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/google', validate(googleLoginSchema), authController.googleLogin);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;
