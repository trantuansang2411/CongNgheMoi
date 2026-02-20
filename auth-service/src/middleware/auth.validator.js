const Joi = require('joi');

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
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
    loginSchema,
    googleLoginSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
};
