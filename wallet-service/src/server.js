require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const walletRoutes = require('./routes/wallet.routes');
const walletService = require('./services/wallet.service');
const rabbitmq = require('../shared/events/rabbitmq');
const logger = require('../shared/utils/logger');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'wallet-service' }));
app.use('/api/v1/wallet', walletRoutes);
app.use(errorHandler);

const PORT = process.env.WALLET_SERVICE_PORT || 3007;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function start() {
    try {
        await rabbitmq.connect(RABBITMQ_URL);
        await rabbitmq.subscribe('wallet-service', 'topup.succeeded', (msg) => walletService.handleTopupSucceeded(msg.data));
        await rabbitmq.subscribe('wallet-service', 'order.paid', (msg) => walletService.handleOrderPaid(msg.data));
        app.listen(PORT, () => logger.info(`Wallet Service running on port ${PORT}`));
    } catch (err) {
        logger.error('Wallet Service failed to start:', err.message);
        process.exit(1);
    }
}
start();
