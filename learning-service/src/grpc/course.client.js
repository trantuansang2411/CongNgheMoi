const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { BadRequestError, NotFoundError, InternalError } = require('../../shared/utils/errors');

const PROTO_PATH = path.join(__dirname, '../../proto/course.proto');
const COURSE_HOST = `${process.env.COURSE_SERVICE_HOST || 'localhost'}:${process.env.COURSE_GRPC_PORT || 50053}`;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const courseProto = grpc.loadPackageDefinition(packageDefinition).course;
const client = new courseProto.CourseService(COURSE_HOST, grpc.credentials.createInsecure());

function getCourseBasicInfo(courseId) {
    return new Promise((resolve, reject) => {
        client.getCourseBasicInfo(
            { courseId },
            { deadline: new Date(Date.now() + 5000) },
            (err, response) => {
                if (!err) return resolve(response);

                switch (err.code) {
                    case grpc.status.INVALID_ARGUMENT:
                    case grpc.status.FAILED_PRECONDITION:
                    case grpc.status.OUT_OF_RANGE:
                        return reject(new BadRequestError(err.message));
                    case grpc.status.NOT_FOUND:
                        return reject(new NotFoundError(err.message));
                    default:
                        return reject(new InternalError(err.message || 'Course gRPC error'));
                }
            }
        );
    });
}

module.exports = { getCourseBasicInfo };
