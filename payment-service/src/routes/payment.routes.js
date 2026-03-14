const express = require('express');
const { Router } = express;
const ctrl = require('../controllers/payment.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const router = Router();
// Các route liên quan đến thanh toán, như nạp tiền vào ví, thanh toán đơn hàng, 
// kiểm tra trạng thái thanh toán và xử lý webhook từ các nhà cung cấp thanh toán.
router.post('/topup', authenticate, ctrl.topup);
router.post('/order', authenticate, ctrl.payOrder);
router.get('/:paymentIntentId/status', authenticate, ctrl.getStatus);
router.post(
	'/webhook/stripe',
	express.raw({ type: 'application/json' }),
	(req, res, next) => {
		req.params.provider = 'stripe';
		return ctrl.webhook(req, res, next);
	}
); // Stripe needs raw body for signature verification
router.post('/webhook/:provider', ctrl.webhook); // No auth — called by provider

module.exports = router;
