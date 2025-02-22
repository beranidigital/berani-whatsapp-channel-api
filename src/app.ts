import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { DatabaseService } from './database';
import { WhatsAppService } from './services/whatsapp.service';
import { AuthMiddleware, errorHandler } from './middleware/auth.middleware';
import { TenantController } from './controllers/tenant.controller';
import { MessageController } from './controllers/message.controller';
import { createTenantRouter } from './routes/tenant.routes';
import { createMessageRouter } from './routes/message.routes';
import { config } from './config';

export const createApp = async () => {
    const app = express();
    const db = new DatabaseService();

    // Initialize database
    await db.init().catch(console.error);

    // Initialize services
    const whatsappService = new WhatsAppService(db);

    // Initialize controllers
    const tenantController = new TenantController(db, whatsappService);
    const messageController = new MessageController(db, whatsappService);

    // Initialize middleware
    const authMiddleware = new AuthMiddleware(db);

    // Security middleware
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", "https://unpkg.com"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "blob:"],
                    connectSrc: ["'self'"],
                },
            },
        })
    );

    app.use(cors({
        origin: config.allowedOrigins
    }));

    // Basic middleware
    app.use(express.json());
    app.use(express.static('public'));

    // Rate limiting
    const limiter = rateLimit(config.rateLimit);
    app.use(limiter);

    // Routes
    app.use('/api/tenants', authMiddleware.authenticate, createTenantRouter(tenantController));
    app.use('/api', authMiddleware.authenticate, createMessageRouter(messageController));

    // Error handling
    app.use(errorHandler);

    return app;
};