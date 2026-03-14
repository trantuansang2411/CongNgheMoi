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
            price: course.salePrice > 0 ? course.salePrice : course.basePrice,
            status: course.status,
        });
    } catch (err) {
        callback({ code: grpc.status.NOT_FOUND, message: err.message });
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

async function hideCourseGrpc(call, callback) {
    try {
        await courseService.hideCourse(call.request.courseId);
        callback(null, { success: true, message: 'Course hidden' });
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
        publishCourse: publishCourseGrpc,
        hideCourse: hideCourseGrpc,
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
