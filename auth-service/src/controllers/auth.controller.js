const authService = require('../services/auth.service');

async function register(req, res, next) {
    try {
        const result = await authService.register(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

async function login(req, res, next) {
    try {
        const result = await authService.login(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

async function googleLogin(req, res, next) {
    try {
        const result = await authService.googleLogin(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

async function refreshToken(req, res, next) {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refreshAccessToken(refreshToken);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

async function logout(req, res, next) {
    try {
        const { refreshToken } = req.body;
        await authService.logout(refreshToken);
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
    login,
    googleLogin,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
};
