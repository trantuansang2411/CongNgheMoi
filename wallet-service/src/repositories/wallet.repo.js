const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function getOrCreateWallet(userId) {
    let wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) wallet = await prisma.wallet.create({ data: { id: uuidv4(), userId, balance: 0 } });
    return wallet;
}

async function credit(userId, amount, description, refType, refId) {
    return prisma.$transaction(async (tx) => {
        let wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) wallet = await tx.wallet.create({ data: { id: uuidv4(), userId, balance: 0 } });
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
        await tx.walletTransaction.create({
            data: { id: uuidv4(), walletId: wallet.id, type: 'CREDIT', amount, description, refType, refId },
        });
        return tx.wallet.findUnique({ where: { id: wallet.id } });
    });
}

async function debit(userId, amount, description, refType, refId) {
    return prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet || Number(wallet.balance) < amount) throw new Error('Insufficient balance');
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: amount } } });
        await tx.walletTransaction.create({
            data: { id: uuidv4(), walletId: wallet.id, type: 'DEBIT', amount, description, refType, refId },
        });
        return tx.wallet.findUnique({ where: { id: wallet.id } });
    });
}

async function getTransactions(userId, page = 1, limit = 20) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return { items: [], total: 0 };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        prisma.walletTransaction.findMany({ where: { walletId: wallet.id }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);
    return { items, total, page, limit };
}

module.exports = { prisma, getOrCreateWallet, credit, debit, getTransactions };
