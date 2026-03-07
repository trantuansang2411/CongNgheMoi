const orderRepo = require('../repositories/order.repo');
const grpcClients = require('../grpc/clients');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { BadRequestError, NotFoundError } = require('../../shared/utils/errors');

// ========== CART ==========
async function getCart(studentId) {
    return orderRepo.getCart(studentId);
}

async function addToCart(studentId, courseId) {
    // Get course info via gRPC
    const courseInfo = await grpcClients.getCourseBasicInfo({ courseId });
    if (!courseInfo || !courseInfo.courseId) throw new NotFoundError('Course not found');

    return orderRepo.addToCart(studentId, {
        courseId, titleSnapshot: courseInfo.title, priceSnapshot: Number(courseInfo.price), instructorId: courseInfo.instructorId || null,
    });
}

async function removeFromCart(studentId, courseId) {
    return orderRepo.removeFromCart(studentId, courseId);
}

// ========== CHECKOUT ==========
async function checkout(studentId, { couponCode, couponCourseId, paymentProvider = 'MOCK' }) {
    const cart = await orderRepo.getCart(studentId);
    if (!cart.items || cart.items.length === 0) throw new BadRequestError('Cart is empty');

    // Lấy giá thật từ course-service cho từng item
    const items = await Promise.all(cart.items.map(async (item) => {
        const priceInfo = await grpcClients.getCoursePrice({ courseId: item.courseId });
        const originalPrice = Number(priceInfo.salePrice || priceInfo.basePrice);
        return {
            courseId: item.courseId,
            instructorId: item.instructorId || priceInfo.instructorId,
            titleSnapshot: item.titleSnapshot || priceInfo.title,
            originalPrice,
            finalPrice: originalPrice,
        };
    }));

    // Validate & áp dụng coupon cho course cụ thể
    let discountAmount = 0;
    if (couponCode && couponCourseId) {
        const coupon = await grpcClients.validateCoupon({ courseId: couponCourseId, code: couponCode });
        if (!coupon.valid) throw new BadRequestError(coupon.message || 'Invalid coupon');

        const targetItem = items.find(i => i.courseId === couponCourseId);
        if (targetItem) {
            if (coupon.discountType === 'PERCENT') {
                discountAmount = Math.round(targetItem.originalPrice * Number(coupon.discountValue) / 100);
            } else {
                discountAmount = Number(coupon.discountValue);
            }
            // Đảm bảo discount không vượt quá giá course
            discountAmount = Math.min(discountAmount, targetItem.originalPrice);
            targetItem.finalPrice = targetItem.originalPrice - discountAmount;
        }
    }

    const total = items.reduce((sum, i) => sum + i.finalPrice, 0);

    const order = await orderRepo.createOrder({
        studentId, total, couponCode: couponCode || null, discountAmount: discountAmount || null,
        items,
    });

    // Create payment intent via gRPC
    const paymentResult = await grpcClients.createPaymentIntent({
        type: 'ORDER_PAY', studentId, orderId: order.id, amount: total, currency: 'VND', provider: paymentProvider,
        idempotencyKey: `order_${order.id}`,
    });

    await orderRepo.updateOrderStatus(order.id, paymentResult.status === 'SUCCEEDED' ? 'PAID' : 'PENDING', {
        paymentIntentId: paymentResult.paymentIntentId,
        ...(paymentResult.status === 'SUCCEEDED' ? { paidAt: new Date() } : {}),
    });

    if (paymentResult.status === 'SUCCEEDED') {
        await orderRepo.clearCart(studentId);
        await publishEvent('order.paid', {
            orderId: order.id, studentId, total,
            items: items.map(i => ({ courseId: i.courseId, instructorId: i.instructorId, titleSnapshot: i.titleSnapshot, finalPrice: i.finalPrice })),
        });
        logger.info(`Order ${order.id} auto-paid (MOCK)`);
    }

    return {
        order: { ...order, status: paymentResult.status === 'SUCCEEDED' ? 'PAID' : 'PENDING' },
        paymentIntentId: paymentResult.paymentIntentId,
        checkoutUrl: paymentResult.checkoutUrl || null,
    };
}

// ========== ORDERS ==========
async function getOrders(studentId, page, limit) {
    return orderRepo.findOrdersByStudent(studentId, page, limit);
}

async function getOrderById(studentId, orderId) {
    const order = await orderRepo.findOrderById(orderId);
    if (!order || order.studentId !== studentId) throw new NotFoundError('Order not found');
    return order;
}

// ========== EVENT HANDLERS ==========
async function handlePaymentSucceeded(data) {
    const { orderId, paymentIntentId, studentId, amount } = data;
    const order = await orderRepo.findOrderById(orderId);
    if (!order || order.status === 'PAID') return;

    const updated = await orderRepo.updateOrderStatus(orderId, 'PAID', { paymentIntentId, paidAt: new Date() });
    await orderRepo.clearCart(order.studentId);

    await publishEvent('order.paid', {
        orderId, studentId: order.studentId, total: Number(order.total),
        items: updated.items.map(i => ({ courseId: i.courseId, instructorId: i.instructorId, titleSnapshot: i.titleSnapshot, finalPrice: Number(i.finalPrice) })),
    });
    logger.info(`Order ${orderId} paid via payment webhook`);
}

async function handlePaymentFailed(data) {
    const { orderId } = data;
    await orderRepo.updateOrderStatus(orderId, 'CANCELLED');
    logger.info(`Order ${orderId} cancelled due to payment failure`);
}

module.exports = { getCart, addToCart, removeFromCart, checkout, getOrders, getOrderById, handlePaymentSucceeded, handlePaymentFailed };
