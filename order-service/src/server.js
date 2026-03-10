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
        // Đăng ký các subscriber để lắng nghe các sự kiện 'payment.succeeded' và 'payment.failed' từ RabbitMQ.
        await rabbitmq.subscribe('order-service', 'payment.succeeded', (msg) => orderService.handlePaymentSucceeded(msg.data));
        //khi nhận được sự kiện 'payment.succeeded', hàm handlePaymentSucceeded sẽ được gọi với dữ liệu của sự kiện, 
        // cho phép chúng ta cập nhật trạng thái của đơn hàng tương ứng và thực hiện các hành động cần thiết khác 
        // như xóa giỏ hàng và xuất bản sự kiện 'order.paid'.
        await rabbitmq.subscribe('order-service', 'payment.failed', (msg) => orderService.handlePaymentFailed(msg.data));
        app.listen(PORT, () => logger.info(`Order Service running on port ${PORT}`));
    } catch (err) {
        logger.error('Order Service failed to start:', err.message);
        process.exit(1);
    }
}

async function shutdown(signal) {
    logger.info(`${signal} received. Shutting down Order Service...`);
    await rabbitmq.close();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
