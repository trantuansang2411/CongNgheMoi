const Joi = require('joi');

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
});

const verifyOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required()
        .messages({ 'string.pattern.base': 'OTP must be a 6-digit number' }),
});

const resendOtpSchema = Joi.object({
    email: Joi.string().email().required(),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

const googleLoginSchema = Joi.object({
    idToken: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required(),
});

module.exports = {
    registerSchema,
    verifyOtpSchema,
    resendOtpSchema,
    loginSchema,
    googleLoginSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
};

