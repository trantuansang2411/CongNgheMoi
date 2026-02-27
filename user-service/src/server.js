require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { startGrpcServer } = require('./grpc/server');
const rabbitmq = require('../shared/events/rabbitmq');
const userService = require('./services/user.service');
const logger = require('../shared/utils/logger');

const PORT = process.env.USER_SERVICE_PORT || 3002;
const GRPC_PORT = process.env.USER_GRPC_PORT || 50052;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function start() {
    try {
        await mongoose.connect(`${MONGO_URI}/user_db`);
        logger.info('User Service connected to MongoDB');

        // Kết nối RabbitMQ và subscribe events
        await rabbitmq.connect(RABBITMQ_URL);
        await rabbitmq.subscribe('user-service', 'user.created', async (msg) => {
            const { userId, email } = msg.data;
            await userService.createProfileFromEvent({ userId, email });
        });
        logger.info('User Service subscribed to user.created event');

        startGrpcServer(GRPC_PORT);

        app.listen(PORT, () => {
            logger.info(`User Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('User Service failed to start:', err.message);
        process.exit(1);
    }
}

async function shutdown(signal) {
    logger.info(`${signal} received. Shutting down User Service...`);
    await rabbitmq.close();
    await mongoose.disconnect();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
