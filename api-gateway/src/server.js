require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const logger = require('../shared/utils/logger');

const app = express();

// Security
app.use(helmet());
app.use(cors());
app.use(morgan('dev', { skip: (req) => req.path === '/health' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});
app.use(limiter);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

// Service routes mapping
const services = {
    '/api/v1/auth': { target: `http://${process.env.AUTH_SERVICE_HOST || 'localhost'}:${process.env.AUTH_SERVICE_PORT || 3001}` },
    '/api/v1/users': { target: `http://${process.env.USER_SERVICE_HOST || 'localhost'}:${process.env.USER_SERVICE_PORT || 3002}` },
    '/api/v1/courses': { target: `http://${process.env.COURSE_SERVICE_HOST || 'localhost'}:${process.env.COURSE_SERVICE_PORT || 3003}` },
    '/api/v1/sections': { target: `http://${process.env.COURSE_SERVICE_HOST || 'localhost'}:${process.env.COURSE_SERVICE_PORT || 3003}` },
    '/api/v1/lessons': { target: `http://${process.env.COURSE_SERVICE_HOST || 'localhost'}:${process.env.COURSE_SERVICE_PORT || 3003}` },
    '/api/v1/coupons': { target: `http://${process.env.COURSE_SERVICE_HOST || 'localhost'}:${process.env.COURSE_SERVICE_PORT || 3003}` },
    '/api/v1/search': { target: `http://${process.env.SEARCH_SERVICE_HOST || 'localhost'}:${process.env.SEARCH_SERVICE_PORT || 3004}` },
    '/api/v1/cart': { target: `http://${process.env.ORDER_SERVICE_HOST || 'localhost'}:${process.env.ORDER_SERVICE_PORT || 3005}` },
    '/api/v1/orders': { target: `http://${process.env.ORDER_SERVICE_HOST || 'localhost'}:${process.env.ORDER_SERVICE_PORT || 3005}` },
    '/api/v1/checkout': { target: `http://${process.env.ORDER_SERVICE_HOST || 'localhost'}:${process.env.ORDER_SERVICE_PORT || 3005}` },
    '/api/v1/payments': { target: `http://${process.env.PAYMENT_SERVICE_HOST || 'localhost'}:${process.env.PAYMENT_SERVICE_PORT || 3006}` },
    '/api/v1/wallet': { target: `http://${process.env.WALLET_SERVICE_HOST || 'localhost'}:${process.env.WALLET_SERVICE_PORT || 3007}` },
    '/api/v1/learning': { target: `http://${process.env.LEARNING_SERVICE_HOST || 'localhost'}:${process.env.LEARNING_SERVICE_PORT || 3008}` },
    '/api/v1/certificates': { target: `http://${process.env.CERTIFICATE_SERVICE_HOST || 'localhost'}:${process.env.CERTIFICATE_SERVICE_PORT || 3009}` },
    '/api/v1/reviews': { target: `http://${process.env.REVIEW_SERVICE_HOST || 'localhost'}:${process.env.REVIEW_SERVICE_PORT || 3010}` },
    '/api/v1/notifications': { target: `http://${process.env.NOTIFICATION_SERVICE_HOST || 'localhost'}:${process.env.NOTIFICATION_SERVICE_PORT || 3011}` },
    '/api/v1/admin': { target: `http://${process.env.ADMIN_SERVICE_HOST || 'localhost'}:${process.env.ADMIN_SERVICE_PORT || 3012}` },
};

// Create proxy routes — prepend the mount path back since Express strips it
Object.entries(services).forEach(([routePath, config]) => {
    app.use(routePath, createProxyMiddleware({
        target: config.target,
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000,
        pathRewrite: (path) => routePath + path,
        onError: (err, req, res) => {
            logger.error(`Proxy error for ${routePath}:`, err.message);
            res.status(502).json({ success: false, error: { code: 'BAD_GATEWAY', message: 'Service unavailable' } });
        },
    }));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

const PORT = process.env.API_GATEWAY_PORT || 3000;
app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
});
