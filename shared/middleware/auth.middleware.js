const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

/**
 * Middleware: Verify JWT token from Authorization header
 */
function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Access token is required');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = {
            id: decoded.sub || decoded.id,
            email: decoded.email,
            roles: decoded.roles || [],
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new UnauthorizedError('Token expired'));
        }
        if (err.name === 'JsonWebTokenError') {
            return next(new UnauthorizedError('Invalid token'));
        }
        next(err);
    }
}

/**
 * Middleware: Optional auth — sets req.user if token exists, otherwise continues
 */
function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = {
                id: decoded.sub || decoded.id,
                email: decoded.email,
                roles: decoded.roles || [],
            };
        }
        next();
    } catch {
        // Token invalid but it's optional, so continue
        next();
    }
}

/**
 * Middleware factory: Require specific roles
 * Usage: authorize('ADMIN', 'INSTRUCTOR')
 */
function authorize(...requiredRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new UnauthorizedError('Authentication required'));
        }

        const hasRole = req.user.roles.some((role) => requiredRoles.includes(role));
        if (!hasRole) {
            return next(new ForbiddenError('Insufficient permissions'));
        }

        next();
    };
}

module.exports = {
    authenticate,
    optionalAuth,
    authorize,
};
