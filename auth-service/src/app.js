const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const authRepo = require('./repositories/auth.repo');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'auth-service' });
});

// Public routes
app.use('/api/v1/auth', authRoutes);

// Internal API — service-to-service (protected by internal key)
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-secret-key';

app.post('/internal/roles/add', async (req, res, next) => {
    try {
        const apiKey = req.headers['x-internal-api-key'];
        if (apiKey !== INTERNAL_API_KEY) {
            return res.status(403).json({ success: false, error: 'Invalid internal API key' });
        }
        const { accountId, role } = req.body;
        await authRepo.addRoleToAccount(accountId, role);
        res.json({ success: true, message: `Role ${role} added to account ${accountId}` });
    } catch (e) {
        next(e);
    }
});

// Error handler
app.use(errorHandler);

module.exports = app;

