import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { DatabaseService } from './database';
import { WhatsAppService } from './services/whatsapp.service';
import { AuthMiddleware, errorHandler } from './middleware/auth.middleware';
import { TenantMiddleware } from './middleware/tenant.middleware';
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
    const authMiddleware = new AuthMiddleware();
    const tenantMiddleware = new TenantMiddleware(db);

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
    // Split tenant routes - listing without tenant check, other operations with tenant check
    
    const { listRouter, protectedRouter } = createTenantRouter(tenantController);
    app.use('/api/tenants', authMiddleware.authenticate, listRouter); // List tenants
    app.use('/api/tenants', authMiddleware.authenticate, tenantMiddleware.checkTenant, protectedRouter); // Other tenant operations
    app.use('/api', authMiddleware.authenticate, tenantMiddleware.checkTenant, createMessageRouter(messageController));

    // Error handling
    app.use(errorHandler);

    return app;
};