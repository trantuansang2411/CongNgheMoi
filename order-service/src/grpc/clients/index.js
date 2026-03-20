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
} = require('../../../shared/utils/errors');
// Hàm createClient để tạo một client gRPC cho một dịch vụ cụ thể dựa trên file proto, 
// tên package, tên service và địa chỉ host của dịch vụ đó.
function createClient(protoFile, packageName, serviceName, host) {
    const PROTO_PATH = path.join(__dirname, '../../../proto', protoFile);
    // Sử dụng protoLoader để tải file proto và tạo một định nghĩa gRPC, 
    //loadSync sẽ đọc file proto và chuyển đổi nó thành một định nghĩa gRPC có thể sử dụng trong mã JavaScript.
    const pd = protoLoader.loadSync(PROTO_PATH, { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true });
    // sau đó sử dụng grpc.loadPackageDefinition để tạo một client gRPC cho dịch vụ được chỉ định.
    const proto = grpc.loadPackageDefinition(pd)[packageName];
    return new proto[serviceName](host, grpc.credentials.createInsecure());
}
// Hàm promisify để chuyển đổi các phương thức callback của client gRPC thành các phương thức trả về Promise, 
// giúp dễ dàng sử dụng với async/await trong mã của chúng ta.
function promisify(client, method) {
    return (request) => new Promise((resolve, reject) => {
        client[method](request, { deadline: new Date(Date.now() + 5000) }, (err, response) => {
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
                    return reject(new InternalError(err.message || 'Upstream gRPC error'));
            }
        });
    });
}

const COURSE_HOST = `${process.env.COURSE_SERVICE_HOST || 'localhost'}:${process.env.COURSE_GRPC_PORT || 50053}`;
const PAYMENT_HOST = `${process.env.PAYMENT_SERVICE_HOST || 'localhost'}:${process.env.PAYMENT_GRPC_PORT || 50056}`;
const LEARNING_HOST = `${process.env.LEARNING_SERVICE_HOST || 'localhost'}:${process.env.LEARNING_GRPC_PORT || 50058}`;

const courseClient = createClient('course.proto', 'course', 'CourseService', COURSE_HOST);
const paymentClient = createClient('payment.proto', 'payment', 'PaymentService', PAYMENT_HOST);
const learningClient = createClient('learning.proto', 'learning', 'LearningService', LEARNING_HOST);

module.exports = {
    getCourseBasicInfo: promisify(courseClient, 'getCourseBasicInfo'),
    validateCoupon: promisify(courseClient, 'validateCoupon'),
    createPaymentIntent: promisify(paymentClient, 'createPaymentIntent'),
    getPaymentStatus: promisify(paymentClient, 'getPaymentStatus'),
    hasEnrollment: promisify(learningClient, 'hasEnrollment'),
};
