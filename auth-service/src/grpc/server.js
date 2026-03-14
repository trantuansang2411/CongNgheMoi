const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const authService = require('../services/auth.service');
const logger = require('../../shared/utils/logger');

const PROTO_PATH = path.join(__dirname, '../../proto/auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

async function addRoleToAccount(call, callback) {
    try {
        const { accountId, role } = call.request;
        await authService.addRole(accountId, role);
        callback(null, { success: true, message: `Role ${role} added to account ${accountId}` });
    } catch (err) {
        logger.error('gRPC AddRoleToAccount error:', err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

function startGrpcServer(port) {
    const server = new grpc.Server();
    server.addService(authProto.AuthService.service, {
        addRoleToAccount,
    });

    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) {
            logger.error('Failed to start Auth gRPC server:', err.message);
            return;
        }
        logger.info(`Auth gRPC server listening on port ${boundPort}`);
    });

    return server;
}

module.exports = { startGrpcServer };
