const authService = require('../services/auth.service');

function setRefreshCookie(res, token) {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
    });
}

async function register(req, res, next) {
    try {
        const result = await authService.register(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err); // khi mà next(err) thì err sẽ được chuyển sang middleware error để xử lý nghĩa là Nhảy thẳng tới middleware có đủ 4 tham số: (err, req, res, next)
    }
}

async function verifyRegistrationOtp(req, res, next) {
    try {
        const result = await authService.verifyRegistrationOtp(req.body);
        setRefreshCookie(res, result.refreshToken);
        res.json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
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
        setRefreshCookie(res, result.refreshToken);
        res.json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
    } catch (err) {
        next(err);
    }
}

async function googleLogin(req, res, next) {
    try {
        const result = await authService.googleLogin(req.body);
        setRefreshCookie(res, result.refreshToken);
        res.json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
    } catch (err) {
        next(err);
    }
}

async function refreshToken(req, res, next) {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        const result = await authService.refreshAccessToken(token);
        setRefreshCookie(res, result.refreshToken);
        res.json({ success: true, data: { accessToken: result.accessToken } });
    } catch (err) {
        next(err);
    }
}

async function logout(req, res, next) {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        await authService.logout(token);
        res.clearCookie('refreshToken', { path: '/' });
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

