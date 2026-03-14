const notificationRepo = require('../repositories/notification.repo');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { NotFoundError } = require('../../shared/utils/errors');

async function createAndPublishNotification(payload) {
    const notification = await notificationRepo.createNotification(payload);

    try {
        await publishEvent('notification.created', {
            id: notification._id.toString(),
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            createdAt: notification.createdAt,
        });
    } catch (err) {
        logger.warn(`Failed to publish notification.created for user=${payload.userId}: ${err.message}`);
    }

    return notification;
}

async function getNotifications(userId, page = 1, limit = 20) {
    return notificationRepo.getNotificationsByUser(userId, page, limit);
}

async function markRead(userId, notificationId) {
    const notif = await notificationRepo.markReadById(userId, notificationId);
    if (!notif) throw new NotFoundError('Notification not found');
    return notif;
}

async function markAllRead(userId) {
    return notificationRepo.markAllReadByUser(userId);
}

async function unreadCount(userId) {
    const count = await notificationRepo.countUnreadByUser(userId);
    return { unreadCount: count };
}

// Event handlers
async function handleOrderPaid(data) {
    const { studentId, orderId, items } = data;
    const titles = items.map(i => i.titleSnapshot).join(', ');
    await createAndPublishNotification({
        userId: studentId, type: 'ORDER_PAID',
        title: 'Payment Successful',
        message: `Your order has been confirmed. Courses: ${titles}`,
        data: { orderId },
    });
    logger.info(`Notification: ORDER_PAID for student=${studentId}`);
}

async function handleCertificateIssued(data) {
    const { studentId, courseId, certificateNo } = data;
    await createAndPublishNotification({
        userId: studentId, type: 'CERTIFICATE_ISSUED',
        title: 'Certificate Issued',
        message: `Congratulations! Your certificate ${certificateNo} has been issued.`,
        data: { courseId, certificateNo },
    });
    logger.info(`Notification: CERTIFICATE_ISSUED for student=${studentId}`);
}

async function handleCoursePublished(data) {
    const { instructorId, courseId, title } = data;
    await createAndPublishNotification({
        userId: instructorId,
        type: 'COURSE_PUBLISHED',
        title: 'Course Published',
        message: `Your course "${title}" has been published and is now available for students.`,
        data: { courseId },
    });
    logger.info(`Notification: COURSE_PUBLISHED for instructor=${instructorId}`);
}

async function handleInstructorApproved(data) {
    const { userId, displayName } = data;
    await createAndPublishNotification({
        userId,
        type: 'INSTRUCTOR_APPROVED',
        title: 'Instructor Application Approved',
        message: displayName
            ? `Congratulations ${displayName}! Your instructor application has been approved.`
            : 'Congratulations! Your instructor application has been approved.',
        data: {},
    });
    logger.info(`Notification: INSTRUCTOR_APPROVED for user=${userId}`);
}

module.exports = {
    getNotifications,
    markRead,
    markAllRead,
    unreadCount,
    handleOrderPaid,
    handleCertificateIssued,
    handleCoursePublished,
    handleInstructorApproved,
};
