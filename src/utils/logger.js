const winston = require('winston');
const config = require('../../config');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // Write all logs to file
        new winston.transports.File({
            filename: path.join(config.logsDir, 'error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join(config.logsDir, 'combined.log')
        })
    ]
});

// Add stream for Morgan middleware
logger.stream = {
    write: (message) => logger.info(message.trim())
};

module.exports = logger;