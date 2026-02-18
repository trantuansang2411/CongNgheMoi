const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function findByIdempotencyKey(key) {
    return prisma.paymentIntent.findUnique({ where: { idempotencyKey: key } });
}

async function createPaymentIntent(data) {
    return prisma.paymentIntent.create({
        data: { id: uuidv4(), ...data },
    });
}

async function findPaymentIntentById(id) {
    return prisma.paymentIntent.findUnique({ where: { id }, include: { transactions: true } });
}

async function updatePaymentIntentStatus(id, status, extra = {}) {
    return prisma.paymentIntent.update({ where: { id }, data: { status, ...extra } });
}

async function createTransaction(data) {
    return prisma.paymentTransaction.create({ data: { id: uuidv4(), ...data } });
}

async function createWebhookLog(data) {
    return prisma.webhookLog.create({ data: { id: uuidv4(), ...data } });
}

module.exports = {
    prisma, findByIdempotencyKey, createPaymentIntent, findPaymentIntentById,
    updatePaymentIntentStatus, createTransaction, createWebhookLog,
};
