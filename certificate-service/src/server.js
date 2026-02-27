require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const certificateRoutes = require('./routes/certificate.routes');
const certificateService = require('./services/certificate.service');
const rabbitmq = require('../shared/events/rabbitmq');
const logger = require('../shared/utils/logger');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'certificate-service' }));
app.use('/api/v1/certificates', certificateRoutes);
app.use(errorHandler);

const PORT = process.env.CERTIFICATE_SERVICE_PORT || 3009;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function start() {
    try {
        await mongoose.connect(`${MONGO_URI}/certificate_db`);
        logger.info('Certificate Service connected to MongoDB');
        await rabbitmq.connect(RABBITMQ_URL);
        await rabbitmq.subscribe('certificate-service', 'course.completed', (msg) => certificateService.handleCourseCompleted(msg.data));
        app.listen(PORT, () => logger.info(`Certificate Service running on port ${PORT}`));
    } catch (err) {
        logger.error('Certificate Service failed to start:', err.message);
        process.exit(1);
    }
}

async function shutdown(signal) {
    logger.info(`${signal} received. Shutting down Certificate Service...`);
    await rabbitmq.close();
    await mongoose.disconnect();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
