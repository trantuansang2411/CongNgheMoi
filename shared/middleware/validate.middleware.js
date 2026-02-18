const { BadRequestError } = require('../utils/errors');

/**
 * Middleware factory: Validate request body against a Joi schema
 * Usage: validate(joiSchema)
 */
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const messages = error.details.map((d) => d.message).join(', ');
            return next(new BadRequestError(messages));
        }

        req.body = value;
        next();
    };
}

/**
 * Middleware factory: Validate request query params against a Joi schema
 */
function validateQuery(schema) {
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
function validateParams(schema) {
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
