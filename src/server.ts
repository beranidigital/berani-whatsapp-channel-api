import express, { Request, Response, NextFunction } from 'express';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import qrcodeTerminal from 'qrcode-terminal';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApiResponse, AuthenticatedRequest, MessageRequest, QrResponse, StatusResponse, Tenant, TenantsResponse } from './types';
import { DatabaseService } from './database';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const db = new DatabaseService();

// Initialize database
db.init().catch(console.error);

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Function to initialize a new WhatsApp client for a tenant
async function initializeWhatsAppClient(tenantId: string) {
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: tenantId }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    const tenant: Tenant = {
        id: tenantId,
        apiKey: process.env.API_KEY || '',
        client,
        qrCode: null,
        isReady: false
    };

    // Set up client event handlers
    client.on('qr', async (qr: string) => {
        console.log(`QR Code received for tenant: ${tenantId}`);
        const qrDataUrl = await qrcode.toDataURL(qr);
        await db.updateTenantStatus(tenantId, false, qrDataUrl);
        qrcodeTerminal.generate(qr, { small: true });
    });

    client.on('ready', async () => {
        console.log(`Client is ready for tenant: ${tenantId}`);
        await db.updateTenantStatus(tenantId, true, null);
    });

    client.on('authenticated', () => {
        console.log(`Client is authenticated for tenant: ${tenantId}`);
    });

    client.on('auth_failure', async (msg: string) => {
        console.error(`Authentication failure for tenant ${tenantId}:`, msg);
        await db.updateTenantStatus(tenantId, false);
    });

    // Initialize client
    client.initialize();

    // Store tenant data
    await db.setTenant(tenantId, tenant);
    return tenant;
}

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    const response: ApiResponse = {
        status: 'error',
        message: 'Internal server error'
    };
    res.status(500).json(response);
});

// Authentication middleware
const authenticateRequest = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const apiKey = req.header('x-api-key');
    const tenantId = req.header('x-tenant-id');

    if (!apiKey || apiKey !== process.env.API_KEY) {
        const response: ApiResponse = {
            status: 'error',
            message: 'Unauthorized'
        };
        return res.status(401).json(response);
    }

    if (!tenantId) {
        const response: ApiResponse = {
            status: 'error',
            message: 'Tenant ID is required'
        };
        return res.status(400).json(response);
    }

    (req as AuthenticatedRequest).tenant = tenantId;
    next();
};

// Routes
app.post('/api/tenants/:tenantId', authenticateRequest, async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    
    if (await db.hasTenant(tenantId)) {
        const response: ApiResponse = {
            status: 'error',
            message: 'Tenant already exists'
        };
        return res.status(400).json(response);
    }

    const tenant = await initializeWhatsAppClient(tenantId);
    const response: ApiResponse = {
        status: 'success',
        message: 'Tenant created successfully'
    };
    res.status(201).json(response);
});

app.get('/api/tenants', authenticateRequest, async (req: Request, res: Response) => {
    const tenants = await db.getAllTenants();
    const tenantsArray = tenants.map(({ id, isReady }) => ({ id, isReady }));
    const response: TenantsResponse = {
        status: 'success',
        tenants: tenantsArray
    };
    res.json(response);
});

app.get('/api/status', authenticateRequest, async (req: Request, res: Response) => {
    const tenant = await db.getTenant((req as AuthenticatedRequest).tenant!);
    
    if (!tenant) {
        const response: ApiResponse = {
            status: 'error',
            message: 'Tenant not found'
        };
        return res.status(404).json(response);
    }

    const response: StatusResponse = {
        status: 'success',
        message: 'WhatsApp client status',
        isReady: tenant.isReady
    };
    res.json(response);
});

app.get('/api/qr', authenticateRequest, async (req: Request, res: Response) => {
    const tenant = await db.getTenant((req as AuthenticatedRequest).tenant!);
    
    if (!tenant) {
        const response: ApiResponse = {
            status: 'error',
            message: 'Tenant not found'
        };
        return res.status(404).json(response);
    }

    if (tenant.qrCode) {
        const response: QrResponse = {
            status: 'success',
            qr: tenant.qrCode
        };
        res.json(response);
    } else {
        const response: QrResponse = {
            status: 'error',
            message: 'QR code not available'
        };
        res.status(404).json(response);
    }
});

app.post('/api/send-message', authenticateRequest, async (req: Request, res: Response) => {
    try {
        const tenant = await db.getTenant((req as AuthenticatedRequest).tenant!);
        
        if (!tenant || !tenant.client) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Tenant not found'
            };
            return res.status(404).json(response);
        }

        const { number, message } = req.body as MessageRequest;
        
        if (!number || !message) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Number and message are required'
            };
            return res.status(400).json(response);
        }

        // Format the number
        const formattedNumber = number.replace(/\D/g, '');
        const chatId = `${formattedNumber}@c.us`;

        console.log(`Sending message to: ${chatId} for tenant: ${(req as AuthenticatedRequest).tenant}`);
        console.log('Message:', message);
        
        // Check if number exists on WhatsApp
        const isRegistered = await tenant.client.isRegisteredUser(chatId);
        if (!isRegistered) {
            const response: ApiResponse = {
                status: 'error',
                message: 'The provided number is not registered on WhatsApp'
            };
            return res.status(404).json(response);
        }

        // Send message
        await tenant.client.sendMessage(chatId, message);
        
        const response: ApiResponse = {
            status: 'success',
            message: 'Message sent successfully'
        };
        res.json(response);
    } catch (error) {
        console.error('Error sending message:', error);
        const response: ApiResponse = {
            status: 'error',
            message: 'Failed to send message'
        };
        res.status(500).json(response);
    }
});

app.delete('/api/tenants/:tenantId', authenticateRequest, async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const tenant = await db.getTenant(tenantId);
    
    if (!tenant) {
        const response: ApiResponse = {
            status: 'error',
            message: 'Tenant not found'
        };
        return res.status(404).json(response);
    }

    try {
        if (tenant.client) {
            await tenant.client.destroy();
        }
        await db.deleteTenant(tenantId);
        
        const response: ApiResponse = {
            status: 'success',
            message: 'Tenant deleted successfully'
        };
        res.json(response);
    } catch (error) {
        console.error(`Error deleting tenant ${tenantId}:`, error);
        const response: ApiResponse = {
            status: 'error',
            message: 'Failed to delete tenant'
        };
        res.status(500).json(response);
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});