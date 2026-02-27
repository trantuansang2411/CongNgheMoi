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

async function listApplications(status, page, limit) {
    const result = await grpcClients.listApplications({ status: status || '', page: page || 1, limit: limit || 20 });
    return result;
}

async function approveInstructor(userId, reviewerId) {
    // 1. Duyệt đơn trong User Service (tạo InstructorProfile)
    const result = await grpcClients.reviewApplication({
        applicationId: userId, // dùng userId để tìm application
        status: 'APPROVED',
        reviewerId,
    });

    // 2. Thêm role INSTRUCTOR qua Auth Service internal API
    const response = await fetch(`${AUTH_SERVICE_URL}/internal/roles/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': INTERNAL_API_KEY,
        },
        body: JSON.stringify({ accountId: result.userId || userId, role: 'INSTRUCTOR' }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to add INSTRUCTOR role');

    logger.info(`Admin: approved instructor ${userId}`);
    return { message: `Instructor ${userId} approved successfully` };
}

async function rejectInstructor(userId, reviewerId) {
    await grpcClients.reviewApplication({
        applicationId: userId,
        status: 'REJECTED',
        reviewerId,
    });
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

module.exports = { publishCourse, hideCourse, getCourseInfo, listApplications, approveInstructor, rejectInstructor, banInstructor, unbanInstructor };


