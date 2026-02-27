require('dotenv').config();
const app = require('./app');
const rabbitmq = require('../shared/events/rabbitmq');
const logger = require('../shared/utils/logger');

const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function start() {
    try {
        await rabbitmq.connect(RABBITMQ_URL);
        logger.info('Auth Service connected to RabbitMQ');

        app.listen(PORT, () => {
            logger.info(`Auth Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Auth Service failed to start:', err.message);
        process.exit(1);
    }
}

async function shutdown(signal) {
    logger.info(`${signal} received. Shutting down Auth Service...`);
    await rabbitmq.close();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
