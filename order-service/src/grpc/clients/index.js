const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

function createClient(protoFile, packageName, serviceName, host) {
    const PROTO_PATH = path.join(__dirname, '../../../proto', protoFile);
    const pd = protoLoader.loadSync(PROTO_PATH, { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true });
    const proto = grpc.loadPackageDefinition(pd)[packageName];
    return new proto[serviceName](host, grpc.credentials.createInsecure());
}

function promisify(client, method) {
    return (request) => new Promise((resolve, reject) => {
        client[method](request, { deadline: new Date(Date.now() + 5000) }, (err, response) => {
            if (err) reject(err); else resolve(response);
        });
    });
}

const COURSE_HOST = `${process.env.COURSE_SERVICE_HOST || 'localhost'}:${process.env.COURSE_GRPC_PORT || 50053}`;
const PAYMENT_HOST = `${process.env.PAYMENT_SERVICE_HOST || 'localhost'}:${process.env.PAYMENT_GRPC_PORT || 50056}`;

const courseClient = createClient('course.proto', 'course', 'CourseService', COURSE_HOST);
const paymentClient = createClient('payment.proto', 'payment', 'PaymentService', PAYMENT_HOST);

module.exports = {
    getCourseBasicInfo: promisify(courseClient, 'getCourseBasicInfo'),
    createPaymentIntent: promisify(paymentClient, 'createPaymentIntent'),
    getPaymentStatus: promisify(paymentClient, 'getPaymentStatus'),
};
