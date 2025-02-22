import { createApp } from './app.js';
import { config } from './config/index.js';

const startServer = async () => {
    try {
        const app = await createApp();
        app.listen(config.port, () => {
            console.log(`Server running on port ${config.port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();