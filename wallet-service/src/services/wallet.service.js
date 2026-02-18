const walletRepo = require('../repositories/wallet.repo');
const logger = require('../../shared/utils/logger');

async function getBalance(userId) {
    const wallet = await walletRepo.getOrCreateWallet(userId);
    return { balance: Number(wallet.balance) };
}

async function getTransactions(userId, page, limit) {
    return walletRepo.getTransactions(userId, page, limit);
}

async function handleTopupSucceeded(data) {
    const { studentId, amount, paymentIntentId } = data;
    await walletRepo.credit(studentId, amount, 'Wallet top-up', 'TOPUP', paymentIntentId);
    logger.info(`Wallet credited ${amount} for student ${studentId} (topup)`);
}

async function handleOrderPaid(data) {
    const { orderId, studentId, total, items } = data;
    const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT || 20);

    for (const item of items) {
        const instructorEarning = Math.floor(item.finalPrice * (100 - platformFeePercent) / 100);
        const platformFee = item.finalPrice - instructorEarning;

        // Credit instructor
        await walletRepo.credit(item.instructorId, instructorEarning, `Course sold: ${item.titleSnapshot}`, 'INSTRUCTOR_EARNING', orderId);

        logger.info(`Instructor ${item.instructorId} earned ${instructorEarning} for course ${item.courseId}`);
    }
}

module.exports = { getBalance, getTransactions, handleTopupSucceeded, handleOrderPaid };
