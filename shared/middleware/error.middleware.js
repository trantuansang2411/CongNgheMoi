const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) { // Đây là middleware xử lý lỗi tập trung.
    // Đặt tên là _next để báo hiệu rằng tham số này không được sử dụng 
    // để tránh warning như: 'next' is defined but never used
    // Log the error
    if (err.isOperational) { // nếu là lỗi do mình dự đoán trước thì log warning do user gây ra
        logger.warn(`${err.statusCode} - ${err.message}`, { // tự thêm level: warm vì bạn gọi logger.warn()
            path: req.path,
            method: req.method,
            errorCode: err.errorCode,
        });
    } else { // còn nếu là lỗi không dự đoán trước thì log error do hệ thống gây ra
        logger.error('Unexpected error:', { // tự thêm level: error vì bạn gọi logger.error()
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
        });
    }

    const statusCode = err.statusCode || 500; // nếu không có statusCode thì mặc định là 500
    const response = {
        success: false,
        error: {
            code: err.errorCode || 'INTERNAL_ERROR',
            message: err.isOperational ? err.message : 'Internal Server Error',
        },
    };

    if (process.env.NODE_ENV === 'development' && !err.isOperational) { // nếu là development thì log stack
        response.error.stack = err.stack;
    }

    res.status(statusCode).json(response); // trả về response
}

module.exports = errorHandler;
