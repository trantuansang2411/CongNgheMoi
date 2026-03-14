require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { startGrpcServer } = require('./grpc/server');
const rabbitmq = require('../shared/events/rabbitmq');
const logger = require('../shared/utils/logger');

const PORT = process.env.COURSE_SERVICE_PORT || 3003;
const GRPC_PORT = process.env.COURSE_GRPC_PORT || 50053;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function start() {
    try {
        await mongoose.connect(`${MONGO_URI}/course_db`);
        logger.info('Course Service connected to MongoDB');

        await rabbitmq.connect(RABBITMQ_URL);

        const courseService = require('./services/course.service');
        await rabbitmq.subscribe('course-service', 'review.created', async (msg) => {
            const { courseId, ratingAvg, ratingCount } = msg.data;
            await courseService.updateCourseRating(courseId, ratingAvg, ratingCount);
        });
        await rabbitmq.subscribe('course-service', 'review.updated', async (msg) => {
            const { courseId, ratingAvg, ratingCount } = msg.data;
            await courseService.updateCourseRating(courseId, ratingAvg, ratingCount);
        });
        await rabbitmq.subscribe('course-service', 'instructor.approved', async (msg) => {
            const { userId, displayName } = msg.data;
            await courseService.handleInstructorData(userId, displayName);
        });
        await rabbitmq.subscribe('course-service', 'instructor.profile.updated', async (msg) => {
            const { userId, displayName } = msg.data;
            await courseService.handleInstructorData(userId, displayName);
        });

        startGrpcServer(GRPC_PORT);

        app.listen(PORT, () => {
            logger.info(`Course Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Course Service failed to start:', err.message);
        process.exit(1);
    }
}

async function shutdown(signal) {
    logger.info(`${signal} received. Shutting down Course Service...`);
    await rabbitmq.close();
    await mongoose.disconnect();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
