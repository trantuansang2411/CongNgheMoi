const { BadRequestError } = require('../utils/errors');

/**
 * Middleware factory: Validate request body against a Joi schema
 * Usage: validate(joiSchema)
 */
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { // join sẽ kiểm tra req.body có đúng shape không, type không, thiếu field không, sai format không
            abortEarly: false, // Joi trả về tất cả lỗi cùng lúc. còn true thì gặp lỗi đầu tiên đã dừng và trả về
            stripUnknown: true, // loại bỏ các field không có định nghĩa trong schema
        });

        if (error) {
            const messages = error.details.map((d) => d.message).join(', '); // nếu có lỗi thì join tất cả error message lại thành string
            return next(new BadRequestError(messages)); // chuyển sang middleware error để xử lý
        }

        req.body = value; // nếu mà không có lỗi thì gán value vào req.body
        next(); // chuyển sang middleware tiếp theo
    };
}

/**
 * Middleware factory: Validate request query params against a Joi schema
 */
function validateQuery(schema) { // book?limit=10&offset=0
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const messages = error.details.map((d) => d.message).join(', ');
            return next(new BadRequestError(messages));
        }

        req.query = value;
        next();
    };
}

/**
 * Middleware factory: Validate request params against a Joi schema
 */
function validateParams(schema) { // book/:id
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const messages = error.details.map((d) => d.message).join(', ');
            return next(new BadRequestError(messages));
        }

        req.params = value;
        next();
    };
}

module.exports = {
    validate,
    validateQuery,
    validateParams,
};
