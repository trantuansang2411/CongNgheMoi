const { Router } = require('express');
const ctrl = require('../controllers/wallet.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const router = Router();
router.get('/balance', authenticate, ctrl.getBalance);
router.get('/transactions', authenticate, ctrl.getTransactions);
module.exports = router;
