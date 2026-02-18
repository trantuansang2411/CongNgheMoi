const { Router } = require('express');
const ctrl = require('../controllers/order.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const router = Router();

// Cart routes
router.get('/cart', authenticate, ctrl.getCart);
router.post('/cart', authenticate, ctrl.addToCart);
router.delete('/cart/:courseId', authenticate, ctrl.removeFromCart);

// Checkout
router.post('/checkout', authenticate, ctrl.checkout);

// Orders
router.get('/orders', authenticate, ctrl.getOrders);
router.get('/orders/:orderId', authenticate, ctrl.getOrderById);

module.exports = router;
