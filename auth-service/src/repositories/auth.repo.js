const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Hardcoded role IDs
const ROLE_IDS = {
    STUDENT: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    INSTRUCTOR: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    ADMIN: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
};

async function createAccount({ email, passwordHash, provider = 'LOCAL', providerId = null, status = 'PENDING_VERIFICATION' }) {
    return prisma.account.create({
        data: {
            id: uuidv4(),
            email,
            passwordHash,
            provider,
            providerId,
            status,
            accountRoles: {
                create: { roleId: ROLE_IDS.STUDENT }, // Tạo 1 record trong bảng trung gian account_roles
            },
        },
        include: { accountRoles: { include: { role: true } } },
        /*Lấy account vừa tạo
        Join sang accountRoles
        Trong accountRoles lại join sang role*/
    });
}

async function findAccountByEmail(email) {
    return prisma.account.findUnique({
        where: { email },
        include: { accountRoles: { include: { role: true } } },
    });
}

async function findAccountById(id) {
    return prisma.account.findUnique({
        where: { id },
        include: { accountRoles: { include: { role: true } } },
    });
}

async function addRoleToAccount(accountId, roleName) {
    const roleId = ROLE_IDS[roleName];
    if (!roleId) throw new Error(`Role ${roleName} not found`);
    return prisma.accountRole.upsert({
        where: { accountId_roleId: { accountId, roleId } },
        create: { accountId, roleId },
        update: {},
    });
}

async function updateAccountStatus(accountId, status) {
    return prisma.account.update({
        where: { id: accountId },
        data: { status },
    });
}

async function createRefreshToken({ accountId, tokenHash, expiresAt }) {
    return prisma.refreshToken.create({
        data: { id: uuidv4(), accountId, tokenHash, expiresAt },
    });
}

async function findRefreshToken(tokenHash) {
    return prisma.refreshToken.findFirst({
        where: { tokenHash, revokedAt: null },
    });
}

async function revokeRefreshToken(id) {
    return prisma.refreshToken.update({
        where: { id },
        data: { revokedAt: new Date() },
    });
}

async function revokeAllRefreshTokens(accountId) {
    return prisma.refreshToken.updateMany({
        where: { accountId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}

async function createPasswordResetToken({ accountId, tokenHash, expiresAt }) {
    return prisma.passwordResetToken.create({
        data: { id: uuidv4(), accountId, tokenHash, expiresAt },
    });
}

async function findPasswordResetToken(tokenHash) {
    return prisma.passwordResetToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
}

async function markPasswordResetTokenUsed(id) {
    return prisma.passwordResetToken.update({
        where: { id },
        data: { usedAt: new Date() },
    });
}

async function updatePassword(accountId, passwordHash) {
    return prisma.account.update({
        where: { id: accountId },
        data: { passwordHash },
    });
}

// =============================================
// OTP Verification Functions
// =============================================

async function createEmailVerificationOtp({ accountId, codeHash, expiresAt, purpose = 'REGISTER' }) {
    return prisma.emailVerificationOtp.create({
        data: { id: uuidv4(), accountId, codeHash, expiresAt, purpose },
    });
}

async function findLatestOtpByAccountId(accountId) {
    return prisma.emailVerificationOtp.findFirst({
        where: {
            accountId,
            usedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
    });
}

async function incrementOtpAttempts(otpId) {
    return prisma.emailVerificationOtp.update({
        where: { id: otpId },
        data: { attempts: { increment: 1 } },
    });
}

async function markOtpUsed(otpId) {
    return prisma.emailVerificationOtp.update({
        where: { id: otpId },
        data: { usedAt: new Date() },
    });
}

async function revokeOtp(otpId) {
    return prisma.emailVerificationOtp.update({
        where: { id: otpId },
        data: { revokedAt: new Date() },
    });
}

async function revokeAllOtps(accountId) {
    return prisma.emailVerificationOtp.updateMany({
        where: { accountId, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}

module.exports = {
    prisma,
    ROLE_IDS,
    createAccount,
    findAccountByEmail,
    findAccountById,
    addRoleToAccount,
    updateAccountStatus,
    createRefreshToken,
    findRefreshToken,
    revokeRefreshToken,
    revokeAllRefreshTokens,
    createPasswordResetToken,
    findPasswordResetToken,
    markPasswordResetTokenUsed,
    updatePassword,
    createEmailVerificationOtp,
    findLatestOtpByAccountId,
    incrementOtpAttempts,
    markOtpUsed,
    revokeOtp,
    revokeAllOtps,
};

