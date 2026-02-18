const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const userRoutes = require('./routes/user.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'user-service' });
});

app.use('/api/v1/users', userRoutes);

app.use(errorHandler);

module.exports = app;
