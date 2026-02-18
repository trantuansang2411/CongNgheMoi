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

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'learning-service' }));

// Routes
app.get('/api/v1/learning/my-courses', authenticate, learningController.getMyCourses);
app.get('/api/v1/learning/courses/:courseId', authenticate, learningController.getEnrollment);
app.get('/api/v1/learning/courses/:courseId/progress', authenticate, learningController.getLessonProgress);
app.post('/api/v1/learning/courses/:courseId/complete', authenticate, learningController.markLessonComplete);

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
        await rabbitmq.subscribe('learning-service', 'order.paid', (msg) => learningService.handleOrderPaid(msg.data));
        startGrpcServer(GRPC_PORT);
        app.listen(PORT, () => logger.info(`Learning Service running on port ${PORT}`));
    } catch (err) {
        logger.error('Learning Service failed to start:', err.message);
        process.exit(1);
    }
}
start();
