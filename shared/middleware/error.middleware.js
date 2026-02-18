const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
    // Log the error
    if (err.isOperational) {
        logger.warn(`${err.statusCode} - ${err.message}`, {
            path: req.path,
            method: req.method,
            errorCode: err.errorCode,
        });
    } else {
        logger.error('Unexpected error:', {
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
        });
    }

    const statusCode = err.statusCode || 500;
    const response = {
        success: false,
        error: {
            code: err.errorCode || 'INTERNAL_ERROR',
            message: err.isOperational ? err.message : 'Internal Server Error',
        },
    };

    if (process.env.NODE_ENV === 'development' && !err.isOperational) {
        response.error.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

module.exports = errorHandler;
