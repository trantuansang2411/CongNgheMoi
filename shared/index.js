const logger = require('./utils/logger');
const errors = require('./utils/errors');
const rabbitmq = require('./events/rabbitmq');
const authMiddleware = require('./middleware/auth.middleware');
const errorHandler = require('./middleware/error.middleware');
const { validate, validateQuery, validateParams } = require('./middleware/validate.middleware');

module.exports = {
    logger,
    ...errors,
    rabbitmq,
    authMiddleware,
    errorHandler,
    validate,
    validateQuery,
    validateParams,
};
