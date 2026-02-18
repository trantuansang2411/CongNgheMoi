const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const courseRoutes = require('./routes/course.routes');
const sectionRoutes = require('./routes/section.routes');
const lessonRoutes = require('./routes/lesson.routes');
const couponRoutes = require('./routes/coupon.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'course-service' });
});

app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/courses/:courseId/sections', sectionRoutes);
app.use('/api/v1/courses/:courseId/sections/:sectionId/lessons', lessonRoutes);
app.use('/api/v1/courses/:courseId/coupons', couponRoutes);

app.use(errorHandler);

module.exports = app;
