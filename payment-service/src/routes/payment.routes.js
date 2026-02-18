const { Router } = require('express');
const ctrl = require('../controllers/payment.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const router = Router();

router.post('/topup', authenticate, ctrl.topup);
router.post('/order', authenticate, ctrl.payOrder);
router.get('/:paymentIntentId/status', authenticate, ctrl.getStatus);
router.post('/webhook/:provider', ctrl.webhook); // No auth — called by provider

module.exports = router;
