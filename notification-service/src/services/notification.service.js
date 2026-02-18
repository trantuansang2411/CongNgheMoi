const Notification = require('../models/mongoose/Notification.model');
const logger = require('../../shared/utils/logger');
const { NotFoundError } = require('../../shared/utils/errors');

async function getNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        Notification.find({ userId }).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
        Notification.countDocuments({ userId }),
    ]);
    return { items, total, page, limit };
}

async function markRead(userId, notificationId) {
    const notif = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
    );
    if (!notif) throw new NotFoundError('Notification not found');
    return notif;
}

async function markAllRead(userId) {
    const result = await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
    );
    return { modifiedCount: result.modifiedCount };
}

async function unreadCount(userId) {
    const count = await Notification.countDocuments({ userId, read: false });
    return { unreadCount: count };
}

// Event handlers
async function handleOrderPaid(data) {
    const { studentId, orderId, items } = data;
    const titles = items.map(i => i.titleSnapshot).join(', ');
    await Notification.create({
        userId: studentId, type: 'ORDER_PAID',
        title: 'Payment Successful',
        message: `Your order has been confirmed. Courses: ${titles}`,
        data: { orderId },
    });
    logger.info(`Notification: ORDER_PAID for student=${studentId}`);
}

async function handleCourseEnrolled(data) {
    const { studentId, courseId, title } = data;
    await Notification.create({
        userId: studentId, type: 'COURSE_ENROLLED',
        title: 'Course Enrolled',
        message: `You have been enrolled in: ${title}`,
        data: { courseId },
    });
    logger.info(`Notification: COURSE_ENROLLED for student=${studentId}`);
}

async function handleCertificateIssued(data) {
    const { studentId, courseId, certificateNo } = data;
    await Notification.create({
        userId: studentId, type: 'CERTIFICATE_ISSUED',
        title: 'Certificate Issued',
        message: `Congratulations! Your certificate ${certificateNo} has been issued.`,
        data: { courseId, certificateNo },
    });
    logger.info(`Notification: CERTIFICATE_ISSUED for student=${studentId}`);
}

module.exports = { getNotifications, markRead, markAllRead, unreadCount, handleOrderPaid, handleCourseEnrolled, handleCertificateIssued };
