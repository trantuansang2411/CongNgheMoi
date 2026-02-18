require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../shared/middleware/error.middleware');
const adminRoutes = require('./routes/admin.routes');
const logger = require('../shared/utils/logger');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'admin-service' }));
app.use('/api/v1/admin', adminRoutes);
app.use(errorHandler);

const PORT = process.env.ADMIN_SERVICE_PORT || 3012;

app.listen(PORT, () => {
    logger.info(`Admin Service running on port ${PORT}`);
});
