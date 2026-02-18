const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const Enrollment = require('../models/mongoose/Enrollment.model');
const logger = require('../../shared/utils/logger');

const PROTO_PATH = path.join(__dirname, '../../proto/learning.proto');

function startGrpcServer(port) {
    const pd = protoLoader.loadSync(PROTO_PATH, { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true });
    const proto = grpc.loadPackageDefinition(pd).learning;

    const server = new grpc.Server();
    server.addService(proto.LearningService.service, {
        hasEnrollment: async (call, callback) => {
            try {
                const { studentId, courseId } = call.request;
                const enrollment = await Enrollment.findOne({ studentId, courseId }).lean();
                callback(null, {
                    enrolled: !!enrollment,
                    enrollmentId: enrollment ? enrollment._id.toString() : '',
                    status: enrollment ? enrollment.status : '',
                });
            } catch (err) {
                callback({ code: grpc.status.INTERNAL, message: err.message });
            }
        },
        getStudentsByCourse: async (call, callback) => {
            try {
                const { courseId, page = 1, limit = 20 } = call.request;
                const skip = (page - 1) * limit;
                const [students, total] = await Promise.all([
                    Enrollment.find({ courseId }).skip(skip).limit(limit).lean(),
                    Enrollment.countDocuments({ courseId }),
                ]);
                callback(null, {
                    students: students.map(s => ({ studentId: s.studentId, enrolledAt: s.enrolledAt?.toISOString() || '', progressPercent: s.progressPercent || 0 })),
                    total,
                });
            } catch (err) {
                callback({ code: grpc.status.INTERNAL, message: err.message });
            }
        },
    });

    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
        if (err) { logger.error('Learning gRPC failed:', err.message); return; }
        logger.info(`Learning gRPC server running on port ${port}`);
    });
}

module.exports = { startGrpcServer };
