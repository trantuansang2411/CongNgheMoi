require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const orderRoutes = require('./routes/order.routes');
const orderService = require('./services/order.service');
const rabbitmq = require('../shared/events/rabbitmq');
const logger = require('../shared/utils/logger');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order-service' }));
app.use('/api/v1', orderRoutes);
app.use(errorHandler);

const PORT = process.env.ORDER_SERVICE_PORT || 3005;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function start() {
    try {
        await rabbitmq.connect(RABBITMQ_URL);
        await rabbitmq.subscribe('order-service', 'payment.succeeded', (msg) => orderService.handlePaymentSucceeded(msg.data));
        await rabbitmq.subscribe('order-service', 'payment.failed', (msg) => orderService.handlePaymentFailed(msg.data));
        app.listen(PORT, () => logger.info(`Order Service running on port ${PORT}`));
    } catch (err) {
        logger.error('Order Service failed to start:', err.message);
        process.exit(1);
    }
}
start();
