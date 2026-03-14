require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const { authenticate } = require('../shared/middleware/auth.middleware');
const learningController = require('./controllers/learning.controller');
const learningService = require('./services/learning.service');
const { startGrpcServer } = require('./grpc/server');
const rabbitmq = require('../shared/events/rabbitmq');
const logger = require('../shared/utils/logger');
const route  = require('./routes/learning.routes');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev', { skip: (req) => req.path === '/health' }));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'learning-service' }));

// Routes
app.use('/api/v1/learning', route);

app.use(errorHandler);

const PORT = process.env.LEARNING_SERVICE_PORT || 3008;
const GRPC_PORT = process.env.LEARNING_GRPC_PORT || 50058;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function start() {
    try {
        await mongoose.connect(`${MONGO_URI}/learning_db`);
        logger.info('Learning Service connected to MongoDB');
        await rabbitmq.connect(RABBITMQ_URL);
        // Đăng ký subscriber để lắng nghe sự kiện 'order.paid' từ RabbitMQ, khi nhận được sự kiện này, 
        //hàm handleOrderPaid sẽ được gọi để cấp quyền truy cập vào khóa học cho sinh viên tương ứng
        await rabbitmq.subscribe('learning-service', 'order.paid', (msg) => learningService.handleOrderPaid(msg.data));
        startGrpcServer(GRPC_PORT);
        app.listen(PORT, () => logger.info(`Learning Service running on port ${PORT}`));
    } catch (err) {
        logger.error('Learning Service failed to start:', err.message);
        process.exit(1);
    }
}

async function shutdown(signal) {
    logger.info(`${signal} received. Shutting down Learning Service...`);
    await rabbitmq.close();
    await mongoose.disconnect();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
