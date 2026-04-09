const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const errorHandler = require('../shared/middleware/error.middleware');
const courseRoutes = require('./routes/course.routes');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
// Không dùng cors() — gateway đã quản lý CORS
app.use(express.json());
app.use(morgan('dev', { skip: (req) => req.path === '/health' }));

// Serve uploaded course files
app.use('/course-uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'course-service' });
});

app.use('/api/v1/courses', courseRoutes);

app.use(errorHandler);

module.exports = app;
