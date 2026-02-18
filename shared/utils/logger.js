const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, stack, ...meta }) => {
            let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
            if (Object.keys(meta).length > 0) {
                log += ` ${JSON.stringify(meta)}`;
            }
            if (stack) {
                log += `\n${stack}`;
            }
            return log;
        })
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(({ timestamp, level, message, stack, ...meta }) => {
                    let log = `${timestamp} [${level}]: ${message}`;
                    if (Object.keys(meta).length > 0) {
                        log += ` ${JSON.stringify(meta)}`;
                    }
                    if (stack) {
                        log += `\n${stack}`;
                    }
                    return log;
                })
            ),
        }),
    ],
});

module.exports = logger;
