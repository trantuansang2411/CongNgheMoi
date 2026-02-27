require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const notificationRoutes = require('./routes/notification.routes');
const notificationService = require('./services/notification.service');
const rabbitmq = require('../shared/events/rabbitmq');
const logger = require('../shared/utils/logger');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));
app.use('/api/v1/notifications', notificationRoutes);
app.use(errorHandler);

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3011;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function start() {
    try {
        await mongoose.connect(`${MONGO_URI}/notification_db`);
        logger.info('Notification Service connected to MongoDB');
        await rabbitmq.connect(RABBITMQ_URL);
        await rabbitmq.subscribe('notification-service', 'order.paid', (msg) => notificationService.handleOrderPaid(msg.data));
        await rabbitmq.subscribe('notification-service', 'course.enrolled', (msg) => notificationService.handleCourseEnrolled(msg.data));
        await rabbitmq.subscribe('notification-service', 'certificate.issued', (msg) => notificationService.handleCertificateIssued(msg.data));
        app.listen(PORT, () => logger.info(`Notification Service running on port ${PORT}`));
    } catch (err) {
        logger.error('Notification Service failed to start:', err.message);
        process.exit(1);
    }
}

async function shutdown(signal) {
    logger.info(`${signal} received. Shutting down Notification Service...`);
    await rabbitmq.close();
    await mongoose.disconnect();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
