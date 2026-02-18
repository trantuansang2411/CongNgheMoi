const paymentRepo = require('../repositories/payment.repo');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { BadRequestError, NotFoundError } = require('../../shared/utils/errors');
const { v4: uuidv4 } = require('uuid');

// ============ PROVIDER ADAPTERS ============
const providers = {
    MOCK: {
        async createIntent(intent) {
            // Mock provider auto-succeeds after creation
            return { providerIntentId: `mock_${uuidv4()}`, checkoutUrl: null, autoSucceed: true };
        },
        async handleWebhook(body, headers) { return { eventType: body.type, data: body.data }; },
    },
    STRIPE: {
        async createIntent(intent) {
            try {
                const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [{ price_data: { currency: 'vnd', product_data: { name: intent.type === 'TOPUP' ? 'Wallet Top-up' : `Order ${intent.orderId}` }, unit_amount: Number(intent.amount) }, quantity: 1 }],
                    mode: 'payment',
                    success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`,
                    metadata: { paymentIntentId: intent.id, type: intent.type, orderId: intent.orderId || '' },
                });
                return { providerIntentId: session.id, checkoutUrl: session.url, autoSucceed: false };
            } catch (err) {
                logger.error('Stripe createIntent error:', err.message);
                throw new BadRequestError('Stripe payment creation failed');
            }
        },
        async handleWebhook(body, headers) {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            const sig = headers['stripe-signature'];
            const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
            return { eventType: event.type, data: event.data.object };
        },
    },
    MOMO: {
        async createIntent(intent) {
            const crypto = require('crypto');
            const axios = require('axios');
            const partnerCode = process.env.MOMO_PARTNER_CODE;
            const accessKey = process.env.MOMO_ACCESS_KEY;
            const secretKey = process.env.MOMO_SECRET_KEY;
            const endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api';
            const requestId = uuidv4();
            const orderId = `${intent.id}_${Date.now()}`;
            const orderInfo = intent.type === 'TOPUP' ? 'Wallet Top-up' : `Order Payment ${intent.orderId}`;
            const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`;
            const ipnUrl = `${process.env.PAYMENT_WEBHOOK_URL || 'http://localhost:3006'}/api/v1/payments/webhook/momo`;
            const amount = Number(intent.amount);
            const extraData = Buffer.from(JSON.stringify({ paymentIntentId: intent.id })).toString('base64');
            const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=payWithMethod`;
            const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
            const response = await axios.post(`${endpoint}/create`, {
                partnerCode, requestId, amount, orderId, orderInfo, redirectUrl, ipnUrl,
                requestType: 'payWithMethod', extraData, lang: 'vi', signature,
            });
            if (response.data.resultCode !== 0) throw new BadRequestError(`MoMo error: ${response.data.message}`);
            return { providerIntentId: response.data.orderId, checkoutUrl: response.data.payUrl, autoSucceed: false };
        },
        async handleWebhook(body) {
            return { eventType: body.resultCode === 0 ? 'payment.succeeded' : 'payment.failed', data: body };
        },
    },
};

// ============ SERVICE FUNCTIONS ============
async function createPaymentIntent({ type, studentId, orderId, amount, currency = 'VND', provider = 'MOCK', idempotencyKey }) {
    if (!idempotencyKey) idempotencyKey = uuidv4();

    // Idempotency check
    const existing = await paymentRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
        logger.info(`Idempotent hit: returning existing intent ${existing.id}`);
        return existing;
    }

    const providerAdapter = providers[provider];
    if (!providerAdapter) throw new BadRequestError(`Unsupported provider: ${provider}`);

    const intent = await paymentRepo.createPaymentIntent({
        type, studentId, orderId, amount, currency, provider, idempotencyKey, status: 'PENDING',
    });

    const result = await providerAdapter.createIntent(intent);
    const updateData = { providerIntentId: result.providerIntentId };
    if (result.checkoutUrl) updateData.checkoutUrl = result.checkoutUrl;

    if (result.autoSucceed) {
        updateData.status = 'SUCCEEDED';
        const updated = await paymentRepo.updatePaymentIntentStatus(intent.id, 'SUCCEEDED', updateData);
        await paymentRepo.createTransaction({ paymentIntentId: intent.id, providerTxId: result.providerIntentId, amount, status: 'SUCCEEDED' });

        // Publish events
        if (type === 'TOPUP') {
            await publishEvent('topup.succeeded', { studentId, amount: Number(amount), paymentIntentId: intent.id });
        } else {
            await publishEvent('payment.succeeded', { orderId, paymentIntentId: intent.id, studentId, amount: Number(amount) });
        }
        logger.info(`Payment auto-succeeded (MOCK): ${intent.id}`);
        return updated;
    }

    await paymentRepo.updatePaymentIntentStatus(intent.id, 'PENDING', updateData);
    return { ...intent, ...updateData };
}

async function getPaymentStatus(paymentIntentId) {
    const intent = await paymentRepo.findPaymentIntentById(paymentIntentId);
    if (!intent) throw new NotFoundError('Payment intent not found');
    return intent;
}

async function handleWebhook(provider, body, headers) {
    const providerAdapter = providers[provider];
    if (!providerAdapter) throw new BadRequestError(`Unsupported provider: ${provider}`);

    await paymentRepo.createWebhookLog({ provider, eventType: 'webhook_received', payload: body });

    const { eventType, data } = await providerAdapter.handleWebhook(body, headers);
    let paymentIntentId;

    if (provider === 'STRIPE') {
        paymentIntentId = data.metadata?.paymentIntentId;
    } else if (provider === 'MOMO') {
        const extraData = data.extraData ? JSON.parse(Buffer.from(data.extraData, 'base64').toString()) : {};
        paymentIntentId = extraData.paymentIntentId;
    }

    if (!paymentIntentId) { logger.warn('Webhook missing paymentIntentId'); return; }

    const intent = await paymentRepo.findPaymentIntentById(paymentIntentId);
    if (!intent) { logger.warn(`Intent not found: ${paymentIntentId}`); return; }
    if (intent.status !== 'PENDING') { logger.warn(`Intent already processed: ${paymentIntentId}`); return; }

    if (eventType.includes('succeeded') || eventType === 'checkout.session.completed') {
        await paymentRepo.updatePaymentIntentStatus(intent.id, 'SUCCEEDED');
        await paymentRepo.createTransaction({ paymentIntentId: intent.id, providerTxId: data.id || data.orderId, amount: intent.amount, status: 'SUCCEEDED', rawResponse: data });

        if (intent.type === 'TOPUP') {
            await publishEvent('topup.succeeded', { studentId: intent.studentId, amount: Number(intent.amount), paymentIntentId: intent.id });
        } else {
            await publishEvent('payment.succeeded', { orderId: intent.orderId, paymentIntentId: intent.id, studentId: intent.studentId, amount: Number(intent.amount) });
        }
        logger.info(`Payment succeeded via webhook: ${intent.id}`);
    } else {
        await paymentRepo.updatePaymentIntentStatus(intent.id, 'FAILED');
        await paymentRepo.createTransaction({ paymentIntentId: intent.id, amount: intent.amount, status: 'FAILED', rawResponse: data });

        if (intent.type === 'ORDER_PAY') {
            await publishEvent('payment.failed', { orderId: intent.orderId, paymentIntentId: intent.id });
        }
        logger.info(`Payment failed via webhook: ${intent.id}`);
    }
}

module.exports = { createPaymentIntent, getPaymentStatus, handleWebhook };
