const { Router } = require('express');
const ctrl = require('../controllers/wallet.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const router = Router();
// Các route liên quan đến ví điện tử, bao gồm:
// - GET /balance: Lấy số dư hiện tại của ví điện tử của người dùng đã xác thực.
// - GET /transactions: Lấy lịch sử giao dịch của ví điện tử của người dùng đã xác thực.
router.get('/balance', authenticate, ctrl.getBalance);
router.get('/transactions', authenticate, ctrl.getTransactions);
module.exports = router;
