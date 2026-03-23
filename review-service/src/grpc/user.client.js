const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const {
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    InternalError,
} = require('../../shared/utils/errors');

const PROTO_PATH = path.join(__dirname, '../../proto/user.proto');
const USER_HOST = `${process.env.USER_SERVICE_HOST || 'localhost'}:${process.env.USER_GRPC_PORT || 50052}`;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;
const client = new userProto.UserService(USER_HOST, grpc.credentials.createInsecure());

function getUserProfile(userId) {
    return new Promise((resolve, reject) => {
        client.getUserProfile(
            { userId },
            { deadline: new Date(Date.now() + 5000) },
            (err, response) => {
                if (!err) return resolve(response);

                switch (err.code) {
                    case grpc.status.INVALID_ARGUMENT:
                    case grpc.status.FAILED_PRECONDITION:
                    case grpc.status.OUT_OF_RANGE:
                        return reject(new BadRequestError(err.message));
                    case grpc.status.UNAUTHENTICATED:
                        return reject(new UnauthorizedError(err.message));
                    case grpc.status.PERMISSION_DENIED:
                        return reject(new ForbiddenError(err.message));
                    case grpc.status.NOT_FOUND:
                        return reject(new NotFoundError(err.message));
                    case grpc.status.ALREADY_EXISTS:
                        return reject(new ConflictError(err.message));
                    default:
                        return reject(new InternalError(err.message || 'User gRPC error'));
                }
            }
        );
    });
}

module.exports = { getUserProfile };