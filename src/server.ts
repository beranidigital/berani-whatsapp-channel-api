import { createApp } from './app';
import { config } from './config';

const startServer = async () => {
    try {
        const server = await createApp();
        if (!server) throw new Error('Failed to create server');
        console.log(`Server running on port ${config.port}`);
        console.log('Visit http://localhost:3000 in your browser');
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();