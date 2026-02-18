const paymentService = require('../services/payment.service');

const topup = async (req, res, next) => {
    try {
        const { amount, currency, provider, idempotencyKey } = req.body;
        const result = await paymentService.createPaymentIntent({
            type: 'TOPUP', studentId: req.user.id, amount, currency, provider, idempotencyKey,
        });
        res.status(201).json({ success: true, data: result });
    } catch (e) { next(e); }
};

const payOrder = async (req, res, next) => {
    try {
        const { orderId, amount, currency, provider, idempotencyKey } = req.body;
        const result = await paymentService.createPaymentIntent({
            type: 'ORDER_PAY', studentId: req.user.id, orderId, amount, currency, provider, idempotencyKey,
        });
        res.status(201).json({ success: true, data: result });
    } catch (e) { next(e); }
};

const getStatus = async (req, res, next) => {
    try {
        res.json({ success: true, data: await paymentService.getPaymentStatus(req.params.paymentIntentId) });
    } catch (e) { next(e); }
};

const webhook = async (req, res, next) => {
    try {
        const provider = req.params.provider.toUpperCase();
        await paymentService.handleWebhook(provider, req.body, req.headers);
        res.json({ received: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

module.exports = { topup, payOrder, getStatus, webhook };
