const { createLogger, format, transports } = require('winston');

const logger = createLogger({ // logger sẽ ghi log vào console
    level: process.env.LOG_LEVEL || 'info', // LOG_LEVEL: level của log, info: thông tin, warn: cảnh báo, error: lỗi để mặc định là info ví dụ khi user login thì ghi info: user login
    format: format.combine( // format: định dạng log (xử lý nội dung hiển thị như thế nào), việc định dạng log là áp dụng hết cho tất cả các transports
        format.splat(), // hỗ trợ logger.info('msg %s', value) hoặc logger.error('msg:', err.message)
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // timestamp: thời gian log
        format.errors({ stack: true }), // cho phép hiển thị error stack
    ),
    transports: [
        new transports.Console({ // để xuất log ra ở đâu
            format: format.combine( // định dạng chỉ áp dụng với transport này thôi
                format.colorize(), // colorize: tô màu cho log format riêng cho transport này
                format.printf(({ timestamp, level, message, stack, ...meta }) => { // printf: định dạng log sẽ override khi có printf ở transport 
                    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
                    if (Object.keys(meta).length > 0) { // Object.keys(meta): lấy ra các key của meta
                        try {
                            log += ` ${JSON.stringify(meta)}`;
                        } catch (_e) {
                            log += ` ${String(meta)}`;
                        }
                    }
                    if (stack) { // stack: stack trace
                        log += `\n${stack}`;
                    }
                    return log;
                })
            ),
        }),
    ],
});

module.exports = logger;
