const grpcClients = require('../grpc/clients');
const logger = require('../../shared/utils/logger');
const rabbitmq = require('../../shared/events/rabbitmq');

async function publishCourse(courseId) {
    const result = await grpcClients.publishCourse({ courseId });
    logger.info(`Admin: published course ${courseId}`);
    return result;
}

async function markCourseNeedsFixes(courseId) {
    const result = await grpcClients.markCourseNeedsFixes({ courseId });
    logger.info(`Admin: marked course needs fixes ${courseId}`);
    return result;
}

async function listSubmittedCourses(status, page, limit) {
    return grpcClients.listSubmittedCourses({ status: status || '', page: page || 1, limit: limit || 20 });
}

async function getCourseReviewDetail(courseId) {
    return grpcClients.getCourseReviewDetail({ courseId });
}

async function listApplications(status, page, limit) {
    const result = await grpcClients.listApplications({ status: status || '', page: page || 1, limit: limit || 20 });
    return {
        items: result.applications || [],
        total: result.total || 0,
        page: result.page || (page || 1),
        limit: result.limit || (limit || 20),
    };
}

async function getApplicationDetail(applicationId) {
    const application = await grpcClients.getApplication({ applicationId });

    // Đơn cũ chưa có email → lấy từ auth-service
    if (!application.data?.email) {
        try {
            const { email } = await grpcClients.getAccountEmail({ accountId: application.userId });
            if (email) {
                application.data = { ...application.data, email };
            }
        } catch {
            // Bỏ qua nếu không lấy được
        }
    }

    return application;
}

async function approveInstructor(userId, reviewerId) {
    // 1. Duyệt đơn trong User Service (tạo InstructorProfile)
    const result = await grpcClients.reviewApplication({
        applicationId: userId, // dùng userId để tìm application
        status: 'APPROVED',
        reviewerId: reviewerId, // có thể lấy từ req.user.id nếu cần
    });

    // 2. Thêm role INSTRUCTOR qua Auth Service gRPC
    await grpcClients.addRoleToAccount({
        accountId: result.userId || userId,
        role: 'INSTRUCTOR',
    });

    // 3. Gửi thông báo đến người dùng
    await rabbitmq.publishEvent('instructor.approved', {
        userId: result.userId || userId,
        displayName: result.displayName || '',
    });

    logger.info(`Admin: approved instructor ${userId}`);
    return { message: `Instructor ${userId} approved successfully` };
}

async function rejectInstructor(userId, reviewerId) {
    await grpcClients.reviewApplication({
        applicationId: userId,
        status: 'REJECTED',
        reviewerId: reviewerId,
    });

    await rabbitmq.publishEvent('instructor.rejected', { userId });

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

module.exports = {
    publishCourse,
    markCourseNeedsFixes,
    listSubmittedCourses,
    getCourseReviewDetail,
    listApplications,
    getApplicationDetail,
    approveInstructor,
    rejectInstructor,
    banInstructor,
    unbanInstructor,
};


