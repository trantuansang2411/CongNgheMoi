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

const PROTO_PATH = path.join(__dirname, '../../proto/learning.proto');
const LEARNING_HOST = `${process.env.LEARNING_SERVICE_HOST || 'localhost'}:${process.env.LEARNING_GRPC_PORT || 50058}`;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const learningProto = grpc.loadPackageDefinition(packageDefinition).learning;
const client = new learningProto.LearningService(LEARNING_HOST, grpc.credentials.createInsecure());

function hasEnrolled(studentId, courseId) {
    return new Promise((resolve, reject) => {
        client.hasEnrollment(
            { studentId, courseId },
            { deadline: new Date(Date.now() + 5000) },
            (err, response) => {
                if (!err) return resolve(!!response?.enrolled);

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
                        return reject(new InternalError(err.message || 'Learning gRPC error'));
                }
            }
        );
    });
}

module.exports = { hasEnrolled };