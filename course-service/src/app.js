const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const courseRoutes = require('./routes/course.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'course-service' });
});

app.use('/api/v1/courses', courseRoutes);

app.use(errorHandler);

module.exports = app;
