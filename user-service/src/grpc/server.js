const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const userService = require('../services/user.service');
const logger = require('../../shared/utils/logger');

const PROTO_PATH = path.join(__dirname, '../../proto/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false, //proto field user_id sẽ được convert sang camelCase userId khi bạn đọc call.request
    longs: String, // nếu có int64/uint64 thì sẽ convert thành string (JS không an toàn với số 64-bit)
    enums: String, // enum (nếu có) sẽ ra string.
    defaults: true, // field không có vẫn có default (string -> "", bool -> false…)
    oneofs: true,
    /*
    Tại sao cần oneof?
    Vì đôi khi API có nhiều cách truyền input.
    Ví dụ:
    Login bằng email
    Hoặc login bằng phone
    Hoặc login bằng username
    Bạn không muốn client gửi cả 3 cùng lúc.
    */
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

async function getUserProfile(call, callback) {
    try {
        const profile = await userService.getProfile(call.request.userId);
        callback(null, {
            userId: profile.userId,
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl,
            email: '',
            bio: profile.bio,
        });
    } catch (err) {
        logger.error('gRPC GetUserProfile error:', err.message);
        callback({ code: grpc.status.NOT_FOUND, message: err.message });
    }
}

async function getInstructorProfile(call, callback) {
    try {
        const profile = await userService.getInstructorProfile(call.request.userId);
        callback(null, {
            userId: profile.userId,
            displayName: profile.displayName,
            headline: profile.headline,
            status: profile.status,
        });
    } catch (err) {
        logger.error('gRPC GetInstructorProfile error:', err.message);
        callback({ code: grpc.status.NOT_FOUND, message: err.message });
    }
}

async function updateInstructorStatus(call, callback) {
    try {
        await userService.updateInstructorStatus(call.request.userId, call.request.status);
        callback(null, { success: true, message: 'Status updated' });
    } catch (err) {
        logger.error('gRPC UpdateInstructorStatus error:', err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

async function reviewApplication(call, callback) {
    try {
        const { applicationId, status, reviewerId } = call.request;

        // Admin truyền userId, cần tìm application PENDING của user đó
        const application = await userService.getApplication(applicationId);
        const realId = application._id.toString();

        const result = await userService.reviewApplication(realId, status, reviewerId);
        callback(null, {
            success: true,
            message: `Application ${status.toLowerCase()}`,
            userId: result.userId,
        });
    } catch (err) {
        logger.error('gRPC ReviewApplication error:', err.message);
        const code = err.statusCode === 404 ? grpc.status.NOT_FOUND : grpc.status.INTERNAL;
        callback({ code, message: err.message });
    }
}

async function listApplications(call, callback) {
    try {
        const { status, page, limit } = call.request;
        const filter = status ? { status } : {};
        const result = await userService.listApplications(filter, page || 1, limit || 20);
        callback(null, {
            applications: result.items.map(app => ({
                id: app._id?.toString() || app.id,
                userId: app.userId,
                status: app.status,
                fullName: app.data?.fullName || '',
                headline: app.data?.headline || '',
                createdAt: app.createdAt?.toISOString() || '',
            })),
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    } catch (err) {
        logger.error('gRPC ListApplications error:', err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

function startGrpcServer(port) {
    const server = new grpc.Server();
    server.addService(userProto.UserService.service, {
        getUserProfile,
        getInstructorProfile,
        updateInstructorStatus,
        reviewApplication,
        listApplications,
    });

    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) {
            logger.error('Failed to start User gRPC server:', err.message);
            return;
        }
        logger.info(`User gRPC server listening on port ${boundPort}`);
    });

    return server;
}

module.exports = { startGrpcServer };

