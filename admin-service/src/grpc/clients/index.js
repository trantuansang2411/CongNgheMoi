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
const USER_HOST = `${process.env.USER_SERVICE_HOST || 'localhost'}:${process.env.USER_GRPC_PORT || 50052}`;
const AUTH_HOST = `${process.env.AUTH_SERVICE_HOST || 'localhost'}:${process.env.AUTH_GRPC_PORT || 50051}`;

const courseClient = createClient('course.proto', 'course', 'CourseService', COURSE_HOST);
const userClient = createClient('user.proto', 'user', 'UserService', USER_HOST);
const authClient = createClient('auth.proto', 'auth', 'AuthService', AUTH_HOST);

module.exports = {
    publishCourse: promisify(courseClient, 'publishCourse'),
    markCourseNeedsFixes: promisify(courseClient, 'markCourseNeedsFixes'),
    listSubmittedCourses: promisify(courseClient, 'listSubmittedCourses'),
    getCourseReviewDetail: promisify(courseClient, 'getCourseReviewDetail'),
    updateInstructorStatus: promisify(userClient, 'updateInstructorStatus'),
    reviewApplication: promisify(userClient, 'reviewApplication'),
    listApplications: promisify(userClient, 'listApplications'),
    addRoleToAccount: promisify(authClient, 'addRoleToAccount'),
};

