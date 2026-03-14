const Notification = require('../models/mongoose/Notification.model');

async function getNotificationsByUser(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        Notification.find({ userId }).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
        Notification.countDocuments({ userId }),
    ]);

    return { items, total, page, limit };
}

async function markReadById(userId, notificationId) {
    return Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
    );
}

async function markAllReadByUser(userId) {
    const result = await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
    );

    return { modifiedCount: result.modifiedCount };
}

async function countUnreadByUser(userId) {
    return Notification.countDocuments({ userId, read: false });
}

async function createNotification(payload) {
    return Notification.create(payload);
}

module.exports = {
    getNotificationsByUser,
    markReadById,
    markAllReadByUser,
    countUnreadByUser,
    createNotification,
};