const express = require('express');
const morgan = require('morgan');
const config = require('../config');
const logger = require('./utils/logger');
const whatsappRoutes = require('./routes/whatsapp.routes');

// Create Express app
const app = express();

// Request logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Parse JSON bodies
app.use(express.json());

// API routes
app.use('/api', whatsappRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    
    res.status(500).json({
        error: 'Internal Server Error',
        message: config.nodeEnv === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
const startServer = () => {
    try {
        app.listen(config.port, () => {
            logger.info(`Server running on port ${config.port}`);
            logger.info(`Environment: ${config.nodeEnv}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection:', err);
    process.exit(1);
});

// Export for testing
module.exports = {
    app,
    startServer
};