const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const userService = require('../services/user.service');
const logger = require('../../shared/utils/logger');

const PROTO_PATH = path.join(__dirname, '../../proto/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
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

function startGrpcServer(port) {
    const server = new grpc.Server();
    server.addService(userProto.UserService.service, {
        getUserProfile,
        getInstructorProfile,
        updateInstructorStatus,
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
