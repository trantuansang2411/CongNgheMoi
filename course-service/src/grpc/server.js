const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const courseService = require('../services/course.service');
const logger = require('../../shared/utils/logger');

const PROTO_PATH = path.join(__dirname, '../../proto/course.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false, longs: String, enums: String, defaults: true, oneofs: true,
});
const courseProto = grpc.loadPackageDefinition(packageDefinition).course;

async function getCoursePrice(call, callback) {
    try {
        const data = await courseService.getCoursePrice(call.request.courseId);
        callback(null, data);
    } catch (err) {
        logger.error('gRPC GetCoursePrice error:', err.message);
        callback({ code: grpc.status.NOT_FOUND, message: err.message });
    }
}

async function validateCoupon(call, callback) {
    try {
        const result = await courseService.validateCoupon(call.request.courseId, call.request.code);
        callback(null, result);
    } catch (err) {
        logger.error('gRPC ValidateCoupon error:', err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

async function getCourseBasicInfo(call, callback) {
    try {
        const course = await courseService.getCourse(call.request.courseId);
        callback(null, {
            courseId: course.courseId,
            title: course.title,
            instructorId: course.instructorId,
            totalLessons: course.totalLessons,
            price: course.saleprice > 0 ? course.salePrice : course.basePrice,
            status: course.status,
        });
    } catch (err) {
        callback({ code: grpc.status.NOT_FOUND, message: err.message });
    }
}

async function listSubmittedCourses(call, callback) {
    try {
        const page = call.request.page || 1;
        const limit = call.request.limit || 20;
        const result = await courseService.getSubmittedCourses(page, limit);
        callback(null, {
            items: result.items.map((course) => ({
                courseId: course.courseId,
                title: course.title,
                instructorId: course.instructorId,
                instructorName: course.instructorName || '',
                thumbnailUrl: course.thumbnailUrl || '',
                basePrice: course.basePrice || 0,
                salePrice: course.salePrice || 0,
                currency: course.currency || 'VND',
                totalSections: course.totalSections || 0,
                totalLessons: course.totalLessons || 0,
                totalDurationSec: course.totalDurationSec || 0,
                submittedAt: course.submittedAt ? course.submittedAt.toISOString() : '',
            })),
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    } catch (err) {
        logger.error('gRPC ListSubmittedCourses error:', err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

async function getCourseReviewDetail(call, callback) {
    try {
        const detail = await courseService.getCourseReviewDetail(call.request.courseId);
        callback(null, {
            course: {
                courseId: detail.course.courseId,
                instructorId: detail.course.instructorId,
                instructorName: detail.course.instructorName || '',
                title: detail.course.title,
                slug: detail.course.slug || '',
                description: detail.course.description || '',
                objectives: detail.course.objectives || [],
                requirements: detail.course.requirements || [],
                outcomes: detail.course.outcomes || [],
                topicId: detail.course.topicId || '',
                thumbnailUrl: detail.course.thumbnailUrl || '',
                basePrice: detail.course.basePrice || 0,
                salePrice: detail.course.salePrice || 0,
                currency: detail.course.currency || 'VND',
                status: detail.course.status,
                totalSections: detail.course.totalSections || 0,
                totalLessons: detail.course.totalLessons || 0,
                totalDurationSec: detail.course.totalDurationSec || 0,
                ratingAvg: detail.course.ratingAvg || 0,
                ratingCount: detail.course.ratingCount || 0,
                submittedAt: detail.course.submittedAt ? detail.course.submittedAt.toISOString() : '',
            },
            sections: detail.sections.map((section) => ({
                id: section._id.toString(),
                sectionId: section.sectionId || '',
                courseId: section.courseId,
                title: section.title,
                orderIndex: section.orderIndex || 0,
            })),
            lessons: detail.lessons.map((lesson) => ({
                id: lesson._id.toString(),
                lessonId: lesson.lessonId || '',
                sectionId: lesson.sectionId,
                title: lesson.title,
                orderIndex: lesson.orderIndex || 0,
                durationSec: lesson.durationSec || 0,
                isPreview: !!lesson.isPreview,
                videoUrl: lesson.videoUrl || '',
            })),
        });
    } catch (err) {
        logger.error('gRPC GetCourseReviewDetail error:', err.message);
        const code = err.statusCode === 404 ? grpc.status.NOT_FOUND : grpc.status.FAILED_PRECONDITION;
        callback({ code, message: err.message });
    }
}

async function publishCourseGrpc(call, callback) {
    try {
        await courseService.publishCourse(call.request.courseId);
        callback(null, { success: true, message: 'Course published' });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

<<<<<<< HEAD
async function hideCourseGrpc(call, callback) {
    try {
        await courseService.hideCourse(call.request.courseId);
        callback(null, { success: true, message: 'Course hidden' });
=======
async function markCourseNeedsFixesGrpc(call, callback) {
    try {
        await courseService.markCourseNeedsFixes(call.request.courseId);
        callback(null, { success: true, message: 'Course marked as needs fixes' });
>>>>>>> c49b3bf (update)
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

function startGrpcServer(port) {
    const server = new grpc.Server();
    server.addService(courseProto.CourseService.service, {
        getCoursePrice,
        validateCoupon,
        getCourseBasicInfo,
<<<<<<< HEAD
        publishCourse: publishCourseGrpc,
        hideCourse: hideCourseGrpc,
=======
        listSubmittedCourses,
        getCourseReviewDetail,
        markCourseNeedsFixes: markCourseNeedsFixesGrpc,
        publishCourse: publishCourseGrpc,
>>>>>>> c49b3bf (update)
    });

    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) {
            logger.error('Failed to start Course gRPC server:', err.message);
            return;
        }
        logger.info(`Course gRPC server listening on port ${boundPort}`);
    });

    return server;
}

module.exports = { startGrpcServer };
