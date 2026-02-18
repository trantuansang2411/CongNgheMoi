const grpcClients = require('../grpc/clients');
const logger = require('../../shared/utils/logger');

const AUTH_SERVICE_URL = `http://${process.env.AUTH_SERVICE_HOST || 'localhost'}:${process.env.AUTH_SERVICE_PORT || 3001}`;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-secret-key';

async function publishCourse(courseId) {
    const result = await grpcClients.publishCourse({ courseId });
    logger.info(`Admin: published course ${courseId}`);
    return result;
}

async function hideCourse(courseId) {
    const result = await grpcClients.hideCourse({ courseId });
    logger.info(`Admin: hid course ${courseId}`);
    return result;
}

async function getCourseInfo(courseId) {
    return grpcClients.getCourseBasicInfo({ courseId });
}

async function approveInstructor(userId) {
    // Add INSTRUCTOR role via auth-service internal API
    const response = await fetch(`${AUTH_SERVICE_URL}/internal/roles/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': INTERNAL_API_KEY,
        },
        body: JSON.stringify({ accountId: userId, role: 'INSTRUCTOR' }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to approve instructor');

    // Update instructor status in user-service
    await grpcClients.updateInstructorStatus({ userId, status: 'ACTIVE' });
    logger.info(`Admin: approved instructor ${userId}`);
    return { message: `Instructor ${userId} approved successfully` };
}

async function rejectInstructor(userId) {
    await grpcClients.updateInstructorStatus({ userId, status: 'REJECTED' });
    logger.info(`Admin: rejected instructor application ${userId}`);
    return { message: `Instructor application ${userId} rejected` };
}

async function banInstructor(userId) {
    const result = await grpcClients.updateInstructorStatus({ userId, status: 'BANNED' });
    logger.info(`Admin: banned instructor ${userId}`);
    return result;
}

async function unbanInstructor(userId) {
    const result = await grpcClients.updateInstructorStatus({ userId, status: 'ACTIVE' });
    logger.info(`Admin: unbanned instructor ${userId}`);
    return result;
}

module.exports = { publishCourse, hideCourse, getCourseInfo, approveInstructor, rejectInstructor, banInstructor, unbanInstructor };

