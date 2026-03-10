const { Router } = require('express');
const ctrl = require('../controllers/order.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const router = Router();

// Cart routes
//các route liên quan đến giỏ hàng, như xem giỏ hàng, thêm vào giỏ hàng, xóa khỏi giỏ hàng
router.get('/cart', authenticate, ctrl.getCart);
router.post('/cart', authenticate, ctrl.addToCart);
router.delete('/cart/:courseId', authenticate, ctrl.removeFromCart);

// Checkout
//route để xử lý quá trình thanh toán, khi người dùng muốn mua các khóa học trong giỏ hàng của họ
router.post('/checkout', authenticate, ctrl.checkout);

// Orders
//các route liên quan đến đơn hàng, như xem danh sách đơn hàng của người dùng, xem chi tiết một đơn hàng cụ thể
router.get('/orders', authenticate, ctrl.getOrders);
router.get('/orders/:orderId', authenticate, ctrl.getOrderById);

module.exports = router;
