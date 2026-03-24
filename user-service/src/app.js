const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const errorHandler = require('../shared/middleware/error.middleware');
const userRoutes = require('./routes/user.routes');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
//ignore get /heath
app.use(morgan('dev', { skip: (req) => req.path === '/health' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'user-service' });
});

app.use('/api/v1/users', userRoutes);

app.use(errorHandler);

module.exports = app;
