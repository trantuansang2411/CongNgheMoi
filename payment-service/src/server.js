require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const paymentRoutes = require('./routes/payment.routes');
const { startGrpcServer } = require('./grpc/server');
const rabbitmq = require('../shared/events/rabbitmq');
const logger = require('../shared/utils/logger');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'payment-service' }));
app.use('/api/v1/payments', paymentRoutes);
app.use(errorHandler);

const PORT = process.env.PAYMENT_SERVICE_PORT || 3006;
const GRPC_PORT = process.env.PAYMENT_GRPC_PORT || 50056;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function start() {
    try {
        await rabbitmq.connect(RABBITMQ_URL);
        startGrpcServer(GRPC_PORT);
        app.listen(PORT, () => logger.info(`Payment Service running on port ${PORT}`));
    } catch (err) {
        logger.error('Payment Service failed to start:', err.message);
        process.exit(1);
    }
}

async function shutdown(signal) {
    logger.info(`${signal} received. Shutting down Payment Service...`);
    await rabbitmq.close();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
