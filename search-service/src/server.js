require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const searchRoutes = require('./routes/search.routes');
const searchService = require('./services/search.service');
const handleCoursePublished = require('./events/consumers/coursePublished.consumer');
const handleCourseUpdated = require('./events/consumers/courseUpdated.consumer');
const handleCourseDeleted = require('./events/consumers/courseDeleted.consumer');
const rabbitmq = require('../shared/events/rabbitmq');
const logger = require('../shared/utils/logger');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev', { skip: (req) => req.path === '/health' }));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'search-service' }));
app.use('/api/v1/search', searchRoutes);
app.use(errorHandler);

const PORT = process.env.SEARCH_SERVICE_PORT || 3004;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function start() {
    try {
        await rabbitmq.connect(RABBITMQ_URL);
        await rabbitmq.subscribe('search-service', 'course.published', handleCoursePublished);
        await rabbitmq.subscribe('search-service', 'course.updated', handleCourseUpdated);
        await rabbitmq.subscribe('search-service', 'course.deleted', handleCourseDeleted);
        await rabbitmq.subscribe('search-service', 'review.created', async (msg) => {
            const { courseId, ratingAvg, ratingCount } = msg.data;
            await searchService.updateRating(courseId, ratingAvg, ratingCount);
        });
        await rabbitmq.subscribe('search-service', 'review.updated', async (msg) => {
            const { courseId, ratingAvg, ratingCount } = msg.data;
            await searchService.updateRating(courseId, ratingAvg, ratingCount);
        });
        app.listen(PORT, () => logger.info(`Search Service running on port ${PORT}`));
    } catch (err) {
        logger.error('Search Service failed to start:', err.message);
        process.exit(1);
    }
}

async function shutdown(signal) {
    logger.info(`${signal} received. Shutting down Search Service...`);
    await rabbitmq.close();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
