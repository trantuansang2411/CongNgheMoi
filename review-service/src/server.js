require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const reviewRoutes = require('./routes/review.routes');
const rabbitmq = require('../shared/events/rabbitmq');
const logger = require('../shared/utils/logger');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'review-service' }));
app.use('/api/v1/reviews', reviewRoutes);
app.use(errorHandler);

const PORT = process.env.REVIEW_SERVICE_PORT || 3010;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function start() {
    try {
        await mongoose.connect(`${MONGO_URI}/review_db`);
        logger.info('Review Service connected to MongoDB');
        await rabbitmq.connect(RABBITMQ_URL);
        app.listen(PORT, () => logger.info(`Review Service running on port ${PORT}`));
    } catch (err) {
        logger.error('Review Service failed to start:', err.message);
        process.exit(1);
    }
}

async function shutdown(signal) {
    logger.info(`${signal} received. Shutting down Review Service...`);
    await rabbitmq.close();
    await mongoose.disconnect();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
