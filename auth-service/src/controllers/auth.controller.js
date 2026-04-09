const authService = require('../services/auth.service');

async function register(req, res, next) {
    try {
        const result = await authService.register(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

async function verifyRegistrationOtp(req, res, next) {
    try {
        const result = await authService.verifyRegistrationOtp(req.body);
        res.json({ success: true, data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken } });
    } catch (err) {
        next(err);
    }
}

async function resendRegistrationOtp(req, res, next) {
    try {
        const result = await authService.resendRegistrationOtp(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

async function login(req, res, next) {
    try {
        const result = await authService.login(req.body);
        res.json({ success: true, data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken } });
    } catch (err) {
        next(err);
    }
}

async function googleLogin(req, res, next) {
    try {
        const result = await authService.googleLogin(req.body);
        res.json({ success: true, data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken } });
    } catch (err) {
        next(err);
    }
}

async function refreshToken(req, res, next) {
    try {
        const token = req.body?.refreshToken;
        const result = await authService.refreshAccessToken(token);
        res.json({ success: true, data: { accessToken: result.accessToken, refreshToken: result.refreshToken } });
    } catch (err) {
        next(err);
    }
}

async function logout(req, res, next) {
    try {
        const token = req.body?.refreshToken;
        await authService.logout(token);
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
}

async function forgotPassword(req, res, next) {
    try {
        const result = await authService.forgotPassword(req.body.email);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

async function resetPassword(req, res, next) {
    try {
        const result = await authService.resetPassword(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    register,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    login,
    googleLogin,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
};
