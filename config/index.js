const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const config = {
    // Server configuration
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Logging configuration
    logLevel: process.env.LOG_LEVEL || 'info',
    logsDir: path.join(__dirname, '../logs'),
    
    // WhatsApp configuration
    whatsapp: {
        chromePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || '/usr/bin/google-chrome',
        maxConnections: parseInt(process.env.MAX_CONNECTIONS || '10', 10),
        sessionPath: path.join(__dirname, '../.wwebjs_auth'),
        puppeteerOptions: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    }
};

module.exports = config;