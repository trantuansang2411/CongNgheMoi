const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const authRepo = require('../repositories/auth.repo');
const logger = require('../../shared/utils/logger');
const { BadRequestError, UnauthorizedError, NotFoundError, ConflictError } = require('../../shared/utils/errors');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function generateTokens(account, roles) {
    const payload = {
        sub: account.id,
        email: account.email,
        roles,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = crypto.randomBytes(64).toString('hex');

    return { accessToken, refreshToken };
}

function getRoleNames(account) {
    return account.accountRoles.map((ar) => ar.role.name);
}

async function register({ email, password }) {
    const existing = await authRepo.findAccountByEmail(email);
    if (existing) {
        throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const account = await authRepo.createAccount({ email, passwordHash });
    const roles = getRoleNames(account);
    const { accessToken, refreshToken } = generateTokens(account, roles);

    // Store refresh token
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await authRepo.createRefreshToken({ accountId: account.id, tokenHash: refreshTokenHash, expiresAt });

    logger.info(`User registered: ${email} with roles: ${roles.join(', ')}`);

    return {
        user: { id: account.id, email: account.email, roles },
        accessToken,
        refreshToken,
    };
}

async function login({ email, password }) {
    const account = await authRepo.findAccountByEmail(email);
    if (!account) {
        throw new UnauthorizedError('Invalid email or password');
    }

    if (account.status !== 'ACTIVE') {
        throw new UnauthorizedError(`Account is ${account.status.toLowerCase()}`);
    }

    if (account.provider !== 'LOCAL') {
        throw new BadRequestError(`Please login with ${account.provider}`);
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) {
        throw new UnauthorizedError('Invalid email or password');
    }

    const roles = getRoleNames(account);
    const { accessToken, refreshToken } = generateTokens(account, roles);

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepo.createRefreshToken({ accountId: account.id, tokenHash: refreshTokenHash, expiresAt });

    logger.info(`User logged in: ${email}`);

    return {
        user: { id: account.id, email: account.email, roles },
        accessToken,
        refreshToken,
    };
}

async function googleLogin({ idToken }) {
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, sub: googleId } = payload;

    let account = await authRepo.findAccountByEmail(email);

    if (!account) {
        // Auto-register
        account = await authRepo.createAccount({
            email,
            passwordHash: null,
            provider: 'GOOGLE',
            providerId: googleId,
        });
        logger.info(`Google user auto-registered: ${email}`);
    } else if (account.provider !== 'GOOGLE') {
        throw new ConflictError('Email already registered with password. Please login with email/password.');
    }

    if (account.status !== 'ACTIVE') {
        throw new UnauthorizedError(`Account is ${account.status.toLowerCase()}`);
    }

    const roles = getRoleNames(account);
    const { accessToken, refreshToken } = generateTokens(account, roles);

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepo.createRefreshToken({ accountId: account.id, tokenHash: refreshTokenHash, expiresAt });

    logger.info(`Google user logged in: ${email}`);

    return {
        user: { id: account.id, email: account.email, roles },
        accessToken,
        refreshToken,
    };
}

async function refreshAccessToken(refreshTokenStr) {
    const tokenHash = crypto.createHash('sha256').update(refreshTokenStr).digest('hex');
    const storedToken = await authRepo.findRefreshToken(tokenHash);

    if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const account = await authRepo.findAccountById(storedToken.accountId);
    if (!account || account.status !== 'ACTIVE') {
        throw new UnauthorizedError('Account not found or inactive');
    }

    // Revoke old, issue new
    await authRepo.revokeRefreshToken(storedToken.id);

    const roles = getRoleNames(account);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(account, roles);

    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepo.createRefreshToken({ accountId: account.id, tokenHash: newHash, expiresAt });

    return { accessToken, refreshToken: newRefreshToken };
}

async function logout(refreshTokenStr) {
    if (!refreshTokenStr) return;
    const tokenHash = crypto.createHash('sha256').update(refreshTokenStr).digest('hex');
    const storedToken = await authRepo.findRefreshToken(tokenHash);
    if (storedToken) {
        await authRepo.revokeRefreshToken(storedToken.id);
    }
    logger.info('User logged out');
}

async function forgotPassword(email) {
    const account = await authRepo.findAccountByEmail(email);
    if (!account) {
        // Don't reveal if email exists
        return { message: 'If the email exists, a reset link has been sent' };
    }

    if (account.provider !== 'LOCAL') {
        return { message: 'Cannot reset password for OAuth accounts' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await authRepo.createPasswordResetToken({ accountId: account.id, tokenHash, expiresAt });

    // In MVP: just log the token. In production: send email
    logger.info(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If the email exists, a reset link has been sent', resetToken };
}

async function resetPassword({ token, newPassword }) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetToken = await authRepo.findPasswordResetToken(tokenHash);

    if (!resetToken) {
        throw new BadRequestError('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await authRepo.updatePassword(resetToken.accountId, passwordHash);
    await authRepo.markPasswordResetTokenUsed(resetToken.id);

    logger.info(`Password reset for account: ${resetToken.accountId}`);

    return { message: 'Password reset successfully' };
}

async function addRole(accountId, roleName) {
    await authRepo.addRoleToAccount(accountId, roleName);
    logger.info(`Role ${roleName} added to account ${accountId}`);
}

module.exports = {
    register,
    login,
    googleLogin,
    refreshAccessToken,
    logout,
    forgotPassword,
    resetPassword,
    addRole,
};
