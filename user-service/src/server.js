require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { startGrpcServer } = require('./grpc/server');
const logger = require('../shared/utils/logger');

const PORT = process.env.USER_SERVICE_PORT || 3002;
const GRPC_PORT = process.env.USER_GRPC_PORT || 50052;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

async function start() {
    try {
        await mongoose.connect(`${MONGO_URI}/user_db`);
        logger.info('User Service connected to MongoDB');

        startGrpcServer(GRPC_PORT);

        app.listen(PORT, () => {
            logger.info(`User Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('User Service failed to start:', err.message);
        process.exit(1);
    }
}

start();
