const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../proto/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false, longs: String, enums: String, defaults: true, oneofs: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

const USER_HOST = `${process.env.USER_SERVICE_HOST || 'localhost'}:${process.env.USER_GRPC_PORT || 50052}`;

const client = new userProto.UserService(USER_HOST, grpc.credentials.createInsecure());

function getInstructorProfile(userId) {
    return new Promise((resolve, reject) => {
        client.getInstructorProfile(
            { userId },
            { deadline: new Date(Date.now() + 5000) },
            (err, response) => {
                if (err) reject(err); else resolve(response);
            }
        );
    });
}

module.exports = { getInstructorProfile };
