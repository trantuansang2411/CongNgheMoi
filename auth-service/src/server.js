require('dotenv').config();
const app = require('./app');
const logger = require('../shared/utils/logger');

const PORT = process.env.AUTH_SERVICE_PORT || 3001;

app.listen(PORT, () => {
    logger.info(`Auth Service running on port ${PORT}`);
});
