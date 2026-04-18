const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const authRepo = require('../repositories/auth.repo');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { AppError, BadRequestError, UnauthorizedError, ConflictError } = require('../../shared/utils/errors');
const { sendOtpEmail } = require('../utils/email.util');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const ms = require('ms'); // chuyển đổi chuỗi thời gian ví dụ '7d', '24h', '30m' thành milliseconds
const REFRESH_TOKEN_MS = ms(JWT_REFRESH_EXPIRES_IN);

const OTP_EXPIRES_MINUTES = parseInt(process.env.OTP_EXPIRES_MINUTES || '1', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);

function generateTokens(account, roles) {
    const payload = {
        sub: account.id,
        email: account.email,
        roles,
    };
    // payload là thông tin của user sẽ được mã hóa trong access token
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    // jwt được ký với JWT_SECRET để mã hoá và có thời gian hết hạn là JWT_EXPIRES_IN
    const refreshToken = crypto.randomBytes(64).toString('hex');
    // randomBytes(64) tạo ra 64 byte ngẫu nhiên, toString('hex') chuyển sang chuỗi hex
    return { accessToken, refreshToken };
}

function getRoleNames(account) {
    return account.accountRoles.map((ar) => ar.role.name);
}

/**
 * Tạo mã OTP 6 chữ số ngẫu nhiên
 */
function generateOtpCode() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Tạo OTP, lưu vào DB và gửi email
 */
async function createAndSendOtp(account) {
    // Thu hồi tất cả OTP cũ chưa dùng
    await authRepo.revokeAllOtps(account.id);

    // Tạo OTP mới
    const otpCode = generateOtpCode();
    const codeHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    const createdOtp = await authRepo.createEmailVerificationOtp({
        accountId: account.id,
        codeHash,
        expiresAt,
    });

    // Fail-closed: nếu gửi mail thất bại thì vô hiệu hóa OTP vừa tạo và trả lỗi 5xx.
    try {
        await sendOtpEmail(account.email, otpCode);
    } catch (err) {
        try {
            await authRepo.revokeOtp(createdOtp.id);
        } catch (cleanupErr) {
            logger.error(`Failed to invalidate OTP ${createdOtp.id} after email delivery failure: ${cleanupErr.message}`);
        }

        logger.error(`Failed to send OTP email to ${account.email}: ${err.message}`);
        throw new AppError('Failed to deliver OTP email. Please try again later.', 503, 'OTP_DELIVERY_FAILED');
    }

    return otpCode;
}

// =============================================
// REGISTER — Tạo account PENDING + gửi OTP
// =============================================
async function register({ email, password }) {
    const existing = await authRepo.findAccountByEmail(email);

    if (existing) {
        // Nếu account đã tồn tại nhưng vẫn PENDING → gửi lại OTP thay vì báo lỗi trùng
        if (existing.status === 'PENDING_VERIFICATION') {
            await createAndSendOtp(existing);
            logger.info(`Re-sent OTP for pending account: ${email}`);
            return {
                email: existing.email,
                requiresVerification: true,
                message: 'OTP sent to email',
            };
        }
        throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // Tạo account với status = PENDING_VERIFICATION (default trong repo)
    const account = await authRepo.createAccount({ email, passwordHash });

    // Tạo và gửi OTP
    await createAndSendOtp(account);

    logger.info(`User registered (pending verification): ${email}`);

    // KHÔNG trả token, KHÔNG publish event
    return {
        email: account.email,
        requiresVerification: true,
        message: 'OTP sent to email',
    };
}

// =============================================
// VERIFY REGISTRATION OTP — Xác thực OTP → kích hoạt → cấp token
// =============================================
async function verifyRegistrationOtp({ email, otp }) {
    const account = await authRepo.findAccountByEmail(email);
    if (!account) {
        throw new BadRequestError('Account not found');
    }

    if (account.status === 'ACTIVE') {
        throw new BadRequestError('Account is already verified');
    }

    if (account.status !== 'PENDING_VERIFICATION') {
        throw new UnauthorizedError(`Account is ${account.status.toLowerCase()}`);
    }

    // Tìm OTP mới nhất còn hiệu lực
    const otpRecord = await authRepo.findLatestOtpByAccountId(account.id);
    if (!otpRecord) {
        throw new BadRequestError('OTP expired or not found. Please request a new one.');
    }

    // Kiểm tra số lần thử
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
        throw new BadRequestError('Too many attempts. Please request a new OTP.');
    }

    // So sánh hash
    const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (inputHash !== otpRecord.codeHash) {
        await authRepo.incrementOtpAttempts(otpRecord.id);
        const remaining = OTP_MAX_ATTEMPTS - otpRecord.attempts - 1;
        throw new BadRequestError(`Invalid OTP. ${remaining} attempt(s) remaining.`);
    }

    // OTP đúng → đánh dấu đã dùng
    await authRepo.markOtpUsed(otpRecord.id);

    // Kích hoạt tài khoản
    await authRepo.updateAccountStatus(account.id, 'ACTIVE');

    // Cấp token
    const roles = getRoleNames(account);
    const { accessToken, refreshToken } = generateTokens(account, roles);

    // Lưu refresh token
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MS);
    await authRepo.createRefreshToken({ accountId: account.id, tokenHash: refreshTokenHash, expiresAt });

    logger.info(`Account verified and activated: ${email}`);

    // Publish event để User Service tạo profile
    await publishEvent('user.created', { userId: account.id, email: account.email, roles });

    return {
        user: { id: account.id, email: account.email, roles },
        accessToken,
        refreshToken,
    };
}

// =============================================
// RESEND REGISTRATION OTP — Gửi lại OTP cho account PENDING
// =============================================
async function resendRegistrationOtp({ email }) {
    const account = await authRepo.findAccountByEmail(email);
    if (!account) {
        // Không tiết lộ email có tồn tại hay không
        return { message: 'If the email exists and is pending verification, a new OTP has been sent.' };
    }

    if (account.status !== 'PENDING_VERIFICATION') {
        throw new BadRequestError('Account is already verified or not eligible for OTP.');
    }

    await createAndSendOtp(account);

    logger.info(`OTP resent for account: ${email}`);

    return { message: 'If the email exists and is pending verification, a new OTP has been sent.' };
}

// =============================================
// LOGIN — Giữ nguyên (đã có check status !== ACTIVE)
// =============================================
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
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MS);
    await authRepo.createRefreshToken({ accountId: account.id, tokenHash: refreshTokenHash, expiresAt });

    logger.info(`User logged in: ${email}`);

    return {
        user: { id: account.id, email: account.email, roles },
        accessToken,
        refreshToken,
    };
}

// =============================================
// GOOGLE LOGIN — Google đã xác thực email → tạo ACTIVE luôn
// =============================================
async function googleLogin({ idToken }) {
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, sub: googleId } = payload;

    let account = await authRepo.findAccountByEmail(email);

    if (!account) {
        // Auto-register với status ACTIVE (Google đã xác thực email)
        account = await authRepo.createAccount({
            email,
            passwordHash: null,
            provider: 'GOOGLE',
            providerId: googleId,
            status: 'ACTIVE',
        });
        logger.info(`Google user auto-registered: ${email}`);
        const newRoles = getRoleNames(account);
        await publishEvent('user.created', { userId: account.id, email: account.email, roles: newRoles });
    } else if (account.provider !== 'GOOGLE') {
        throw new ConflictError('Email already registered with password. Please login with email/password.');
    }

    if (account.status !== 'ACTIVE') {
        throw new UnauthorizedError(`Account is ${account.status.toLowerCase()}`);
    }

    const roles = getRoleNames(account);
    const { accessToken, refreshToken } = generateTokens(account, roles);

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MS);
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
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MS);
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
    verifyRegistrationOtp,
    resendRegistrationOtp,
    login,
    googleLogin,
    refreshAccessToken,
    logout,
    forgotPassword,
    resetPassword,
    addRole,
};
